/**
 * Proctoring service — pure business logic.
 *
 * Public functions are framework-agnostic (no req/res). Controllers and
 * socket handlers both call into this module so HTTP and WS paths stay
 * consistent. The persistence layer is Sequelize today; swap by editing
 * only this file.
 */
const { Op } = require('sequelize');
const {
  ExamSession,
  Violation,
  DeviceFingerprint,
  ProctorActivity,
  AIQuiz,
  QuizAttempt,
  User,
} = require('../models');
const { encrypt, decrypt, newSessionToken } = require('../utils/crypto');
const logger = require('../utils/logger');

// ── Tunables ────────────────────────────────────────────────────────────────
const MAX_FULLSCREEN_EXITS = 3;
const MAX_WARNINGS = 5;
const HEARTBEAT_TIMEOUT_MS = 25_000;

// Severities that bump the warning counter
const WARNING_TYPES = new Set([
  'FULLSCREEN_EXIT',
  'TAB_SWITCH',
  'SCREEN_SHARE_STOPPED',
  'WINDOW_BLUR',
  'BROWSER_MINIMIZE',
  'COPY_ATTEMPT',
  'PASTE_ATTEMPT',
  'BLOCKED_SHORTCUT',
  'DEVTOOLS_OPENED',
]);

const CRITICAL_TYPES = new Set([
  'MULTIPLE_LOGIN',
  'SCREEN_SHARE_DENIED',
]);

// ── Internal helpers ────────────────────────────────────────────────────────
function buildClientView(session) {
  if (!session) return null;
  return {
    sessionId: session.id,
    sessionToken: session.sessionToken,
    quizId: session.quizId,
    attemptId: session.attemptId,
    status: session.status,
    warningsCount: session.warningsCount,
    fullscreenExits: session.fullscreenExits,
    isFullscreen: session.isFullscreen,
    isScreenSharing: session.isScreenSharing,
    isOnline: session.isOnline,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    endedAt: session.endedAt,
    terminationReason: session.terminationReason,
    maxFullscreenExits: MAX_FULLSCREEN_EXITS,
    maxWarnings: MAX_WARNINGS,
  };
}

async function getQuizOrThrow(quizId) {
  const quiz = await AIQuiz.findByPk(quizId);
  if (!quiz) {
    const err = new Error('Quiz not found');
    err.status = 404;
    throw err;
  }
  return quiz;
}

// ── Device fingerprint ──────────────────────────────────────────────────────
async function registerDevice({ userId, fingerprintHash, label, ipAddress, userAgent }) {
  if (!fingerprintHash) return null;
  const [device] = await DeviceFingerprint.findOrCreate({
    where: { userId, fingerprintHash },
    defaults: {
      userId, fingerprintHash, label, ipAddress, userAgent,
      lastSeenAt: new Date(),
    },
  });
  device.lastSeenAt = new Date();
  device.ipAddress = ipAddress || device.ipAddress;
  device.userAgent = userAgent || device.userAgent;
  await device.save();
  return device;
}

// ── Session management ─────────────────────────────────────────────────────
async function getActiveSessionForUser(userId) {
  return ExamSession.findOne({
    where: { participantId: userId, status: { [Op.in]: ['PENDING', 'ACTIVE'] } },
    order: [['created_at', 'DESC']],
  });
}

async function startSession({ userId, quizId, attemptId, fingerprintHash, ipAddress, userAgent, screenSharing }) {
  const quiz = await getQuizOrThrow(quizId);

  // Single-device enforcement: if any other ACTIVE session for this user, terminate it.
  const existingActive = await ExamSession.findOne({
    where: { participantId: userId, status: { [Op.in]: ['PENDING', 'ACTIVE'] } },
  });

  if (existingActive && existingActive.quizId !== Number(quizId)) {
    await terminateSession({
      session: existingActive,
      reason: 'Started exam on another device or quiz',
      type: 'MULTIPLE_LOGIN',
    });
  }

  // Re-entry to same quiz → reuse if active
  if (existingActive && existingActive.quizId === Number(quizId)) {
    return { session: existingActive, quiz, resumed: true };
  }

  const device = await registerDevice({
    userId, fingerprintHash, ipAddress, userAgent,
    label: 'Exam device',
  });

  // Check if already attempted
  const completed = await QuizAttempt.findOne({
    where: { quizId, participantId: userId, status: { [Op.in]: ['SUBMITTED', 'EVALUATED'] } }
  });
  if (completed) {
    const err = new Error('You have already attempted this quiz.');
    err.status = 403;
    throw err;
  }

  // Reuse caller-supplied attempt if provided + valid; else create a new one.
  // This avoids creating a second QuizAttempt when the existing AI-quiz
  // start endpoint already created one.
  let attempt = null;
  if (attemptId) {
    attempt = await QuizAttempt.findOne({
      where: { id: attemptId, participantId: userId, quizId },
    });
  }
  if (!attempt) {
    attempt = await QuizAttempt.findOne({
      where: { quizId, participantId: userId, status: 'IN_PROGRESS' }
    });
  }
  if (!attempt) {
    attempt = await QuizAttempt.create({
      quizId,
      participantId: userId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    });
  }

  const startedAt = new Date();
  const endsAt = quiz.timeLimit
    ? new Date(startedAt.getTime() + quiz.timeLimit * 60_000)
    : null;

  const session = await ExamSession.create({
    quizId,
    attemptId: attempt.id,
    participantId: userId,
    sessionToken: newSessionToken(),
    deviceFingerprintId: device ? device.id : null,
    status: 'PENDING',
    isScreenSharing: !!screenSharing,
    ipAddress,
    userAgent,
    startedAt,
    endsAt,
    encryptedPayload: encrypt({ seed: Date.now(), userId, quizId }),
    lastHeartbeatAt: startedAt,
  });

  return { session, quiz, attempt, resumed: false };
}

async function activateSession(session) {
  if (session.status === 'ACTIVE') return session;
  if (session.status !== 'PENDING') {
    const err = new Error(`Cannot activate session in state ${session.status}`);
    err.status = 409;
    throw err;
  }
  session.status = 'ACTIVE';
  session.isFullscreen = true;
  session.lastHeartbeatAt = new Date();
  await session.save();
  return session;
}

async function heartbeat(session) {
  session.lastHeartbeatAt = new Date();
  await session.save();
  return session;
}

async function terminateSession({ session, reason, type = 'TERMINATED' }) {
  if (['SUBMITTED', 'TERMINATED', 'EXPIRED'].includes(session.status)) {
    return session;
  }
  session.status = 'TERMINATED';
  session.terminationReason = reason || 'Terminated';
  session.endedAt = new Date();
  await session.save();

  await Violation.create({
    sessionId: session.id,
    participantId: session.participantId,
    quizId: session.quizId,
    type,
    severity: 'CRITICAL',
    message: reason,
  });

  // Best-effort: mark attempt submitted so existing AI quiz scoring picks it up
  if (session.attemptId) {
    try {
      await QuizAttempt.update(
        { status: 'SUBMITTED', submittedAt: new Date() },
        { where: { id: session.attemptId, status: 'IN_PROGRESS' } },
      );
    } catch (e) {
      logger.warn('Failed to flag attempt SUBMITTED on terminate', { err: e.message });
    }
  }

  return session;
}

async function submitSession(session) {
  if (['SUBMITTED', 'TERMINATED'].includes(session.status)) return session;
  session.status = 'SUBMITTED';
  session.endedAt = new Date();
  await session.save();
  return session;
}

// ── Violation handling ──────────────────────────────────────────────────────
function severityFor(type) {
  if (CRITICAL_TYPES.has(type)) return 'CRITICAL';
  if (type === 'FULLSCREEN_EXIT') return 'HIGH';
  if (WARNING_TYPES.has(type)) return 'MEDIUM';
  return 'LOW';
}

/**
 * Record a violation, update counters, decide if termination is required.
 * Returns { violation, session, terminated:boolean }
 */
async function recordViolation({ session, type, message, metadata }) {
  if (!type) throw new Error('Violation type required');

  const severity = severityFor(type);
  const violation = await Violation.create({
    sessionId: session.id,
    participantId: session.participantId,
    quizId: session.quizId,
    type, severity, message: message || null,
    metadata: metadata || null,
  });

  let mutated = false;
  if (type === 'FULLSCREEN_EXIT') {
    session.fullscreenExits = (session.fullscreenExits || 0) + 1;
    session.isFullscreen = false;
    mutated = true;
  }
  if (type === 'SCREEN_SHARE_STOPPED' || type === 'SCREEN_SHARE_DENIED') {
    session.isScreenSharing = false;
    mutated = true;
  }
  if (WARNING_TYPES.has(type) || CRITICAL_TYPES.has(type)) {
    session.warningsCount = (session.warningsCount || 0) + 1;
    mutated = true;
  }
  if (mutated) await session.save();

  // Termination policy
  let terminated = false;
  if (
    session.fullscreenExits >= MAX_FULLSCREEN_EXITS ||
    session.warningsCount >= MAX_WARNINGS ||
    severity === 'CRITICAL'
  ) {
    await terminateSession({
      session,
      reason: `Auto-terminated after violation: ${type}`,
      type: 'TERMINATED',
    });
    terminated = true;
  }

  return { violation, session, terminated };
}

async function recordActivity({ session, eventType, payload }) {
  return ProctorActivity.create({
    sessionId: session.id,
    participantId: session.participantId,
    eventType,
    payload: payload || null,
  });
}

// ── Trainer queries ─────────────────────────────────────────────────────────
async function getQuizMonitor(quizId) {
  const sessions = await ExamSession.findAll({
    where: { quizId },
    order: [['created_at', 'DESC']],
  });

  const userIds = [...new Set(sessions.map(s => s.participantId))];
  const users = userIds.length
    ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email'] })
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  return sessions.map(s => ({
    ...buildClientView(s),
    participant: userMap.get(s.participantId) || { id: s.participantId, name: 'Unknown' },
    lastHeartbeatAt: s.lastHeartbeatAt,
  }));
}

async function getSessionViolations(sessionId, { limit = 100 } = {}) {
  return Violation.findAll({
    where: { sessionId },
    order: [['occurredAt', 'DESC']],
    limit,
  });
}

async function exportSessionLogs(sessionId) {
  const session = await ExamSession.findByPk(sessionId);
  if (!session) return null;
  const [violations, activities] = await Promise.all([
    Violation.findAll({ where: { sessionId }, order: [['occurredAt', 'ASC']] }),
    ProctorActivity.findAll({ where: { sessionId }, order: [['occurredAt', 'ASC']] }),
  ]);
  return {
    session: buildClientView(session),
    violations,
    activities,
    exportedAt: new Date(),
  };
}

// ── Reaper for stale sessions ───────────────────────────────────────────────
async function expireStaleSessions() {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const stale = await ExamSession.findAll({
    where: {
      status: 'ACTIVE',
      lastHeartbeatAt: { [Op.lt]: cutoff },
    },
    limit: 50,
  });
  for (const s of stale) {
    s.isOnline = false;
    await s.save();
    await Violation.create({
      sessionId: s.id,
      participantId: s.participantId,
      quizId: s.quizId,
      type: 'HEARTBEAT_LOST',
      severity: 'MEDIUM',
      message: 'No heartbeat received',
    });
  }
  return stale.length;
}

module.exports = {
  // constants
  MAX_FULLSCREEN_EXITS,
  MAX_WARNINGS,
  // session lifecycle
  startSession,
  activateSession,
  heartbeat,
  submitSession,
  terminateSession,
  getActiveSessionForUser,
  // violations & activity
  recordViolation,
  recordActivity,
  // queries
  getQuizMonitor,
  getSessionViolations,
  exportSessionLogs,
  // misc
  registerDevice,
  buildClientView,
  expireStaleSessions,
};
