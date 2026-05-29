/**
 * validateAssessmentSession
 * ─────────────────────────────────────────────────────────────────────────
 * Express middleware that gates protected quiz endpoints (e.g. submit) by
 * verifying the X-Assessment-Session header against an ACTIVE row in
 * assessment_sessions whose attempt_id matches req.params.attemptId.
 *
 * On success: attaches req.assessmentSession and calls next().
 * On failure: 401 SESSION_INVALID — no body leak, no fall-through.
 *
 * Must be mounted AFTER authenticateToken so we can also confirm the
 * session belongs to the calling participant.
 */

const { Op } = require('sequelize');
const { AssessmentSession } = require('../models');

const validateAssessmentSession = async (req, res, next) => {
  try {
    const sessionToken =
      req.headers['x-assessment-session'] ||
      req.headers['X-Assessment-Session'] ||
      '';
    const attemptId = req.params.attemptId;

    if (!sessionToken || !attemptId) {
      return res.status(401).json({
        error: 'SESSION_INVALID',
        message: 'Assessment session is invalid or expired.',
      });
    }

    const session = await AssessmentSession.findOne({
      where: {
        sessionToken,
        attemptId,
        status: 'ACTIVE',
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!session) {
      return res.status(401).json({
        error: 'SESSION_INVALID',
        message: 'Assessment session is invalid or expired.',
      });
    }

    // Defensive: a session must belong to the calling participant.
    if (req.user?.id && Number(session.participantId) !== Number(req.user.id)) {
      return res.status(403).json({
        error: 'SESSION_FORBIDDEN',
        message: 'This session does not belong to the authenticated user.',
      });
    }

    req.assessmentSession = session;
    return next();
  } catch (err) {
    console.error('[validateAssessmentSession] error:', err.message);
    return res.status(500).json({
      error: 'SESSION_VALIDATION_FAILED',
      message: 'Could not validate assessment session.',
    });
  }
};

module.exports = validateAssessmentSession;
