const express = require('express');
const { Op } = require('sequelize');
const {
  AIQuiz,
  Enrollment,
  QuizAttempt,
  QuizResult,
  QuizAnswer,
  AIQuestion,
  AIQuestionOption,
  LessonQuiz,
  QuizProgress,
  ExamSession,
  ProctorActivity,
  Violation,
  AssessmentSession,
  Course,
  Training,
  CourseTrainerAssignment,
  TrainingTrainerAssignment,
  QuizAssignment
} = require('../models');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');
const NotificationService = require('../services/notificationService');
const { assertTransition } = require('../utils/quizStateMachine');

const router = express.Router();

// Middleware to ensure user is logged in
router.use(authenticateToken);

// Helper to check if trainer owns or is assigned to the course/training
async function verifyTrainerAccess(req, res, quiz) {
  const trainerId = req.user.id;
  const role = req.user.role;

  if (role === 'ADMIN') return true;
  if (quiz.trainerId === trainerId) return true;

  if (quiz.courseId) {
    const courseAssigned = await CourseTrainerAssignment.findOne({
      where: { courseId: quiz.courseId, trainerId }
    });
    if (courseAssigned) return true;
  }

  if (quiz.trainingId) {
    const trainingAssigned = await TrainingTrainerAssignment.findOne({
      where: { trainingId: quiz.trainingId, trainerId }
    });
    if (trainingAssigned) return true;
  }

  res.status(403).json({ error: 'You are not authorized to manage this quiz' });
  return false;
}

/**
 * POST /api/quizzes/:id/publish
 * DRAFT → PUBLISHED. Accepts optional start_time, end_time.
 */
router.post('/:id/publish', roleMiddleware('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const quiz = await AIQuiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    assertTransition(quiz, 'PUBLISHED');
    console.log(`[publish] === PUBLISHING QUIZ #${quiz.id} ===`);

    const hasAccess = await verifyTrainerAccess(req, res, quiz);
    if (!hasAccess) return;

    // Resolve trainingId
    let trainingId = quiz.trainingId;
    if (!trainingId && quiz.courseId) {
      const course = await Course.findByPk(quiz.courseId);
      if (course && course.trainingProgramId) trainingId = course.trainingProgramId;
    }
    if (!trainingId) {
      const { Training, TrainingTrainerAssignment } = require('../models');
      const { Op } = require('sequelize');
      const training = await Training.findOne({
        where: { [Op.or]: [{ trainerId: quiz.trainerId }, { createdBy: quiz.trainerId }] }
      });
      if (training) trainingId = training.id;
      else {
        const assignment = await TrainingTrainerAssignment.findOne({ where: { trainerId: quiz.trainerId } });
        if (assignment) trainingId = assignment.trainingId;
      }
    }

    const now = new Date();
    const startTime = req.body.startTime ? new Date(req.body.startTime) : null;
    const endTime = req.body.endTime ? new Date(req.body.endTime) : null;

    // If end_time is provided, validate it
    if (endTime && endTime <= now) {
      return res.status(400).json({ error: 'end_time must be in the future' });
    }
    if (startTime && endTime && startTime >= endTime) {
      return res.status(400).json({ error: 'start_time must be before end_time' });
    }

    const updateData = {
      isPublished: true,
      published: true,
      publishedAt: now,
      status: 'PUBLISHED',
      startTime,
      endTime,
    };
    if (trainingId && !quiz.trainingId) updateData.trainingId = trainingId;
    await quiz.update(updateData);

    // Recompute total_marks from questions
    const questions = await AIQuestion.findAll({ where: { quizId: quiz.id } });
    if (questions.length > 0) {
      const total = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      await quiz.update({ totalMarks: total });
    }

    console.log(`[publish] Quiz #${quiz.id} published. startTime=${startTime}, endTime=${endTime}`);

    // Notifications + socket event
    let participantIds = [];
    const effectiveTrainingId = trainingId || quiz.trainingId;
    if (quiz.courseId) {
      const enrollments = await Enrollment.findAll({ where: { courseId: quiz.courseId, status: 'ENROLLED' } });
      participantIds = enrollments.map(e => e.participantId);
    } else if (effectiveTrainingId) {
      const enrollments = await Enrollment.findAll({ where: { trainingId: effectiveTrainingId, status: 'ENROLLED' } });
      participantIds = enrollments.map(e => e.participantId);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('quiz:published', { quizId: quiz.id, courseId: quiz.courseId, trainingId: quiz.trainingId });
    }

    for (const pId of participantIds) {
      try {
        await NotificationService.createNotification({
          userId: pId,
          message: `New AI Quiz Available: ${quiz.title}`,
          type: 'ANNOUNCEMENT',
          actionUrl: quiz.courseId ? `/participant/courses/${quiz.courseId}/quizzes` : '/participant/quizzes',
          relatedEntityId: quiz.id,
          relatedEntityType: 'AI_QUIZ'
        }, io);
      } catch (err) {
        console.error('Failed to create notification for user:', pId, err.message);
      }
    }

    res.json({ success: true, message: 'Quiz published successfully', quiz });
  } catch (error) {
    console.error('Error publishing quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/quizzes/:id/close
 * PUBLISHED → CLOSED. Manual force-close. Auto-submits any IN_PROGRESS attempts.
 */
router.post('/:id/close', roleMiddleware('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const quiz = await AIQuiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    assertTransition(quiz, 'CLOSED', 'Quiz must be PUBLISHED to close');

    const hasAccess = await verifyTrainerAccess(req, res, quiz);
    if (!hasAccess) return;

    const now = new Date();

    // Auto-submit any in-progress attempts
    const inProgressAttempts = await QuizAttempt.findAll({
      where: { quizId: quiz.id, status: 'IN_PROGRESS' }
    });
    for (const attempt of inProgressAttempts) {
      await attempt.update({ status: 'AUTO_SUBMITTED', submittedAt: now });
    }

    await quiz.update({
      status: 'CLOSED',
      closedAt: now,
      isPublished: true,
      published: true,
    });

    console.log(`[close] Quiz #${quiz.id} closed. ${inProgressAttempts.length} attempts auto-submitted.`);

    const io = req.app.get('io');
    if (io) {
      io.emit('quiz:closed', { quizId: quiz.id });
    }

    res.json({ success: true, message: 'Quiz closed successfully', autoSubmitted: inProgressAttempts.length });
  } catch (error) {
    console.error('Error closing quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/quizzes/:id/unpublish
 * PUBLISHED → DRAFT (only if zero attempts exist).
 */
router.post('/:id/unpublish', roleMiddleware('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const quiz = await AIQuiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    assertTransition(quiz, 'DRAFT', 'Only PUBLISHED quizzes with zero attempts can be unpublished');

    const hasAccess = await verifyTrainerAccess(req, res, quiz);
    if (!hasAccess) return;

    const attemptCount = await QuizAttempt.count({ where: { quizId: quiz.id } });
    if (attemptCount > 0) {
      return res.status(400).json({
        error: 'Cannot unpublish — quiz already has participant attempts. Close it instead.',
        attemptCount
      });
    }

    await quiz.update({
      status: 'DRAFT',
      isPublished: false,
      published: false,
      publishedAt: null,
      startTime: null,
      endTime: null,
    });

    res.json({ success: true, message: 'Quiz returned to draft' });
  } catch (error) {
    console.error('Error unpublishing quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/quizzes/:id/send
 * Sends the quiz to all participants enrolled in the quiz's training.
 * Creates per-participant quiz_assignment records with status='PENDING',
 * publishes the quiz, and sends notifications.
 */
router.post('/:id/send', roleMiddleware('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const quiz = await AIQuiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    console.log(`[send] === SENDING QUIZ #${quiz.id} ===`);
    console.log(`[send] Quiz title: "${quiz.title}", trainingId=${quiz.trainingId}, courseId=${quiz.courseId}`);

    const hasAccess = await verifyTrainerAccess(req, res, quiz);
    if (!hasAccess) return;

    if (!quiz.trainingId) {
      return res.status(400).json({ error: 'Quiz has no training assigned. Please assign a training first.' });
    }

    // Find all participants enrolled in this training
    const enrollments = await Enrollment.findAll({
      where: { trainingId: quiz.trainingId, status: 'ENROLLED' }
    });

    if (enrollments.length === 0) {
      console.log(`[send] No enrolled participants found for training #${quiz.trainingId}`);
      return res.status(400).json({ error: 'No participants are enrolled in this training.' });
    }

    const participantIds = enrollments.map(e => e.participantId);
    console.log(`[send] Found ${participantIds.length} enrolled participants: [${participantIds.join(',')}]`);

    // Create quiz_assignment records for each participant
    const { QuizAssignment } = require('../models');
    const now = new Date();
    let createdCount = 0;

    for (const participantId of participantIds) {
      try {
        await QuizAssignment.findOrCreate({
          where: { quizId: quiz.id, participantId },
          defaults: {
            quizId: quiz.id,
            participantId,
            status: 'PENDING',
            assignedAt: now
          }
        });
        createdCount++;
      } catch (dupErr) {
        // Unique constraint — already assigned, skip
        console.log(`[send] Participant #${participantId} already assigned to quiz #${quiz.id}`);
      }
    }

    console.log(`[send] Created ${createdCount} quiz_assignment records`);

    // Publish the quiz
    await quiz.update({
      isPublished: true,
      publishedAt: now,
      status: 'PUBLISHED',
      published: true
    });

    console.log(`[send] Quiz #${quiz.id} published successfully`);

    // Send notifications to all enrolled participants
    const io = req.app.get('io');
    for (const pId of participantIds) {
      try {
        await NotificationService.createNotification({
          userId: pId,
          message: `New AI Quiz Available: ${quiz.title}`,
          type: 'ANNOUNCEMENT',
          actionUrl: '/participant/quizzes',
          relatedEntityId: quiz.id,
          relatedEntityType: 'AI_QUIZ'
        }, io);
      } catch (err) {
        console.error(`[send] Failed to create notification for user #${pId}:`, err.message);
      }
    }

    console.log(`[send] Notifications sent to ${participantIds.length} participants`);

    // Emit socket event to refresh participant dashboards
    if (io) {
      io.emit('quiz:published', { quizId: quiz.id, trainingId: quiz.trainingId });
      console.log(`[send] Socket event 'quiz:published' emitted`);
    }

    res.json({
      success: true,
      message: `Quiz sent to ${createdCount} participants successfully`,
      data: {
        quizId: quiz.id,
        trainingId: quiz.trainingId,
        participantCount: createdCount,
        isPublished: true
      }
    });
  } catch (error) {
    console.error('[send] Error sending quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/quizzes/:id/publish-result
 * CLOSED → RESULTS_PUBLISHED. Participants can now view scores.
 */
router.post('/:id/publish-result', roleMiddleware('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const quiz = await AIQuiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    assertTransition(quiz, 'RESULTS_PUBLISHED', 'Quiz must be CLOSED before publishing results');

    const hasAccess = await verifyTrainerAccess(req, res, quiz);
    if (!hasAccess) return;

    // Compute rank for each participant based on percentage
    const results = await QuizResult.findAll({
      where: { quizId: quiz.id },
      order: [['percentage', 'DESC']]
    });
    for (let i = 0; i < results.length; i++) {
      await results[i].update({ rank: i + 1 });
    }

    const now = new Date();
    await quiz.update({
      isResultPublished: true,
      resultPublishedAt: now,
      resultStatus: 'PUBLISHED',
      status: 'RESULTS_PUBLISHED'
    });

    const attempts = await QuizAttempt.findAll({
      where: { quizId: quiz.id },
      attributes: ['participantId'],
      group: ['participantId']
    });
    const participantIds = attempts.map(a => a.participantId);

    const io = req.app.get('io');

    if (io) {
      io.emit('quiz:results:published', { quizId: quiz.id, courseId: quiz.courseId, trainingId: quiz.trainingId });
    }

    for (const pId of participantIds) {
      try {
        await NotificationService.createNotification({
          userId: pId,
          message: `Your quiz result is now available for: ${quiz.title}`,
          type: 'FEEDBACK_REPLY',
          actionUrl: quiz.courseId ? `/participant/courses/${quiz.courseId}/quizzes` : '/participant/quizzes',
          relatedEntityId: quiz.id,
          relatedEntityType: 'AI_QUIZ'
        }, io);
      } catch (err) {
        console.error('Failed to create result notification for user:', pId, err.message);
      }
    }

    res.json({ success: true, message: 'Results published successfully', quiz });
  } catch (error) {
    console.error('Error publishing results:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/quizzes/:id
 * Deep deletes a quiz and all associated dependencies.
 */
router.delete('/:id', roleMiddleware('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const quiz = await AIQuiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const hasAccess = await verifyTrainerAccess(req, res, quiz);
    if (!hasAccess) return;

    const quizId = quiz.id;
    const { sequelize } = require('../config/db');

    await sequelize.transaction(async (t) => {
      // 1. Find all dependent entities
      const attempts = await QuizAttempt.findAll({ where: { quizId }, transaction: t });
      const attemptIds = attempts.map(a => a.id);

      const examSessions = await ExamSession.findAll({ where: { quizId }, transaction: t });
      const examSessionIds = examSessions.map(es => es.id);

      const questions = await AIQuestion.findAll({ where: { quizId }, transaction: t });
      const questionIds = questions.map(q => q.id);

      const lessonQuizzes = await LessonQuiz.findAll({ where: { quizId }, transaction: t });
      const lessonQuizIds = lessonQuizzes.map(lq => lq.id);

      // 2. Delete child records
      if (examSessionIds.length > 0) {
        await ProctorActivity.destroy({ where: { sessionId: { [Op.in]: examSessionIds } }, transaction: t });
        await Violation.destroy({ where: { sessionId: { [Op.in]: examSessionIds } }, transaction: t });
      }

      await AssessmentSession.destroy({ where: { quizId }, transaction: t });
      await ExamSession.destroy({ where: { quizId }, transaction: t });

      if (lessonQuizIds.length > 0) {
        await QuizProgress.destroy({ where: { lessonQuizId: { [Op.in]: lessonQuizIds } }, transaction: t });
      }
      await LessonQuiz.destroy({ where: { quizId }, transaction: t });

      if (attemptIds.length > 0) {
        await QuizAnswer.destroy({ where: { attemptId: { [Op.in]: attemptIds } }, transaction: t });
      }
      await QuizResult.destroy({ where: { quizId }, transaction: t });
      await QuizAttempt.destroy({ where: { quizId }, transaction: t });

      if (questionIds.length > 0) {
        await AIQuestionOption.destroy({ where: { questionId: { [Op.in]: questionIds } }, transaction: t });
      }
      await AIQuestion.destroy({ where: { quizId }, transaction: t });

      // 3. Delete parent
      await quiz.destroy({ transaction: t });
    });

    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
