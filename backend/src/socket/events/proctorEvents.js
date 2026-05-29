/**
 * Proctoring socket events.
 *
 * Rooms:
 *   user_<id>            — already joined by the auth middleware
 *   proctor_quiz_<quizId> — trainer monitoring a specific quiz
 *   proctor_session_<id>  — both participant + trainers monitoring a session
 *
 * Participant emits:
 *   proctor:join          { sessionId }
 *   proctor:heartbeat     { sessionId }
 *   proctor:violation     { sessionId, type, message?, metadata? }
 *   proctor:state         { sessionId, isFullscreen?, isScreenSharing?, isOnline? }
 *
 * Trainer emits:
 *   proctor:trainerJoin   { quizId }
 *   proctor:trainerLeave  { quizId }
 *   proctor:forceTerminate { sessionId, reason? }   (admin/trainer)
 *
 * Server broadcasts to trainers:
 *   proctor:update        { type, session, ... }    (started|activated|violation|state|submitted|terminated)
 *   proctor:violation     individual violation row
 *
 * Server pushes to participant:
 *   proctor:terminated    { sessionId, reason }
 *   proctor:warning       { type, message }
 *   proctor:multipleLogin
 */
const proctoring = require('../../services/proctoringService');
const { ExamSession } = require('../../models');
const logger = require('../../utils/logger');

module.exports = function registerProctorEvents(io, socket) {
  // ── Participant joins their own session room ────────────────────────────
  socket.on('proctor:join', async ({ sessionId }, ack) => {
    try {
      const session = await ExamSession.findByPk(sessionId);
      if (!session) return ack?.({ ok: false, error: 'not_found' });

      const isOwner = session.participantId === socket.userId;
      const isTrainer = ['TRAINER', 'ADMIN'].includes(socket.userRole);
      if (!isOwner && !isTrainer) return ack?.({ ok: false, error: 'forbidden' });

      socket.join(`proctor_session_${sessionId}`);

      // Single-device enforcement: kick prior socket connections of same user
      // that are inside a different session.
      if (isOwner) {
        const sockets = await io.in(`user_${socket.userId}`).fetchSockets();
        for (const s of sockets) {
          if (s.id !== socket.id && s.data?.activeSessionId && s.data.activeSessionId !== sessionId) {
            s.emit('proctor:multipleLogin');
            s.disconnect(true);
          }
        }
        socket.data.activeSessionId = sessionId;

        session.isOnline = true;
        await session.save();
        io.to(`proctor_quiz_${session.quizId}`).emit('proctor:update', {
          type: 'online',
          session: proctoring.buildClientView(session),
        });
      }

      ack?.({ ok: true, session: proctoring.buildClientView(session) });
    } catch (err) {
      logger.error('proctor:join failed', { err: err.message });
      ack?.({ ok: false, error: err.message });
    }
  });

  // ── Heartbeat (cheap, no DB read) ───────────────────────────────────────
  socket.on('proctor:heartbeat', async ({ sessionId }) => {
    try {
      const session = await ExamSession.findByPk(sessionId);
      if (!session || session.participantId !== socket.userId) return;
      await proctoring.heartbeat(session);
      io.to(`proctor_quiz_${session.quizId}`).emit('proctor:heartbeat', {
        sessionId,
        at: session.lastHeartbeatAt,
      });
    } catch (err) {
      logger.warn('heartbeat error', { err: err.message });
    }
  });

  // ── State change pushed by client (fullscreen/screen-share/online) ──────
  socket.on('proctor:state', async ({ sessionId, ...flags }) => {
    try {
      const session = await ExamSession.findByPk(sessionId);
      if (!session || session.participantId !== socket.userId) return;
      let mutated = false;
      if (typeof flags.isFullscreen === 'boolean') {
        session.isFullscreen = flags.isFullscreen; mutated = true;
      }
      if (typeof flags.isScreenSharing === 'boolean') {
        session.isScreenSharing = flags.isScreenSharing; mutated = true;
      }
      if (typeof flags.isOnline === 'boolean') {
        session.isOnline = flags.isOnline; mutated = true;
      }
      if (mutated) await session.save();
      io.to(`proctor_quiz_${session.quizId}`).emit('proctor:update', {
        type: 'state',
        session: proctoring.buildClientView(session),
      });
    } catch (err) {
      logger.warn('state error', { err: err.message });
    }
  });

  // ── Violation reported via socket (low-latency path) ───────────────────
  socket.on('proctor:violation', async (data, ack) => {
    try {
      const { sessionId, type, message, metadata } = data || {};
      const session = await ExamSession.findByPk(sessionId);
      if (!session || session.participantId !== socket.userId) {
        return ack?.({ ok: false, error: 'forbidden' });
      }
      const result = await proctoring.recordViolation({ session, type, message, metadata });

      io.to(`proctor_quiz_${session.quizId}`).emit('proctor:update', {
        type: 'violation',
        session: proctoring.buildClientView(session),
        violation: result.violation,
      });

      if (result.terminated) {
        socket.emit('proctor:terminated', {
          sessionId,
          reason: session.terminationReason,
        });
      } else {
        socket.emit('proctor:warning', { type, message });
      }
      ack?.({ ok: true, terminated: result.terminated });
    } catch (err) {
      logger.error('proctor:violation error', { err: err.message });
      ack?.({ ok: false, error: err.message });
    }
  });

  // ── Trainer joins/leaves a quiz monitoring room ─────────────────────────
  socket.on('proctor:trainerJoin', async ({ quizId }, ack) => {
    if (!['TRAINER', 'ADMIN'].includes(socket.userRole)) return ack?.({ ok: false });
    socket.join(`proctor_quiz_${quizId}`);
    try {
      const monitor = await proctoring.getQuizMonitor(quizId);
      ack?.({ ok: true, sessions: monitor });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('proctor:trainerLeave', ({ quizId }) => {
    socket.leave(`proctor_quiz_${quizId}`);
  });

  // ── Trainer force-terminate (in addition to REST) ──────────────────────
  socket.on('proctor:forceTerminate', async ({ sessionId, reason }, ack) => {
    try {
      if (!['TRAINER', 'ADMIN'].includes(socket.userRole)) {
        return ack?.({ ok: false, error: 'forbidden' });
      }
      const session = await ExamSession.findByPk(sessionId);
      if (!session) return ack?.({ ok: false, error: 'not_found' });
      await proctoring.terminateSession({ session, reason: reason || 'Trainer terminated' });

      io.to(`user_${session.participantId}`).emit('proctor:terminated', {
        sessionId, reason: session.terminationReason,
      });
      io.to(`proctor_quiz_${session.quizId}`).emit('proctor:update', {
        type: 'terminated',
        session: proctoring.buildClientView(session),
      });
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // ── Disconnect: mark session offline ────────────────────────────────────
  socket.on('disconnect', async () => {
    const sid = socket.data?.activeSessionId;
    if (!sid) return;
    try {
      const session = await ExamSession.findByPk(sid);
      if (session && session.participantId === socket.userId) {
        session.isOnline = false;
        await session.save();
        io.to(`proctor_quiz_${session.quizId}`).emit('proctor:update', {
          type: 'offline',
          session: proctoring.buildClientView(session),
        });
      }
    } catch (err) {
      logger.warn('proctor disconnect cleanup failed', { err: err.message });
    }
  });
};
