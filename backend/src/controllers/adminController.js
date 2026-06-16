const {
  Training,
  Enrollment,
  Feedback,
  User,
  Notification,
  Course,
  CourseTrainerAssignment,
  Certificate,
  Lesson,
  LessonMaterial,
  LessonQuiz,
  QuizProgress,
  LessonAssessment,
  AssessmentSubmission,
  LessonProgress,
  ParticipantTracking,
  AIQuiz,
  AIQuestion,
  QuizAttempt,
  QuizAnswer,
  QuizResult,
  AssessmentSession,
  ExamSession,
  Violation,
  ProctorActivity,
  CodingAssessment,
  CodingQuestion,
  TestCase,
  CodingSubmission,
  SubmissionResult,
  CodingViolation,
  PlagiarismReport,
  LiveSession,
  Note,
  AIDocument,
  TrainingTrainerAssignment
} = require('../models');
const ActivityService = require('../services/activityService');

const updateTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, trainerId, trainerIds, startDate, endDate, capacity, sequentialLearning } = req.body;

    const training = await Training.findByPk(id);
    if (!training) return res.status(404).json({ error: 'Training not found' });

    let finalTrainerIds = [];
    if (Array.isArray(trainerIds)) {
      finalTrainerIds = trainerIds.map(tId => parseInt(tId));
    } else if (trainerId) {
      finalTrainerIds = [parseInt(trainerId)];
    }

    if (finalTrainerIds.length > 0) {
      const trainers = await User.findAll({ where: { id: finalTrainerIds, role: 'TRAINER' } });
      if (trainers.length !== finalTrainerIds.length) {
        return res.status(400).json({ error: 'One or more trainer IDs are invalid or not trainers' });
      }

      const { TrainingTrainerAssignment } = require('../models');
      await TrainingTrainerAssignment.destroy({ where: { trainingId: id } });
      const assignments = finalTrainerIds.map(tId => ({
        trainingId: id,
        trainerId: tId
      }));
      await TrainingTrainerAssignment.bulkCreate(assignments);
    }

    const primaryTrainerId = finalTrainerIds.length > 0 ? finalTrainerIds[0] : (trainerId ? parseInt(trainerId) : training.trainerId);

    await training.update({
      title: title || training.title,
      description: description !== undefined ? description : training.description,
      trainerId: primaryTrainerId,
      startDate: startDate ? new Date(startDate) : training.startDate,
      endDate: endDate ? new Date(endDate) : training.endDate,
      capacity: capacity !== undefined ? (capacity ? parseInt(capacity) : null) : training.capacity,
      sequentialLearning: sequentialLearning !== undefined ? !!sequentialLearning : training.sequentialLearning
    });

    // Automatically find/create/update corresponding Course
    let course = await Course.findOne({ where: { trainingProgramId: id } });
    if (!course) {
      course = await Course.create({
        trainingProgramId: id,
        trainerId: primaryTrainerId,
        title: title || training.title,
        description: description !== undefined ? description : training.description,
        status: 'PUBLISHED'
      });
    } else {
      await course.update({
        title: title || training.title,
        description: description !== undefined ? description : training.description,
        trainerId: primaryTrainerId
      });
    }

    // Sync CourseTrainerAssignment
    if (finalTrainerIds.length > 0) {
      await CourseTrainerAssignment.destroy({ where: { courseId: course.id } });
      const courseAssignments = finalTrainerIds.map(tId => ({
        courseId: course.id,
        trainerId: tId
      }));
      await CourseTrainerAssignment.bulkCreate(courseAssignments);
    }

    const updatedTraining = await Training.findByPk(id, {
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name'], required: false },
        {
          model: TrainingTrainerAssignment,
          as: 'trainerAssignments',
          include: [{ model: User, as: 'trainer', attributes: ['id', 'name'] }]
        }
      ]
    });

    const assignedTrainers = (updatedTraining.trainerAssignments || []).map(ta => ta.trainer).filter(Boolean);
    const trainerNames = assignedTrainers.length > 0 ? assignedTrainers.map(tr => tr.name).join(', ') : (updatedTraining.trainer ? updatedTraining.trainer.name : null);
    const resTrainerIds = assignedTrainers.length > 0 ? assignedTrainers.map(tr => tr.id) : (updatedTraining.trainerId ? [updatedTraining.trainerId] : []);

    res.json({
      message: 'Training updated successfully',
      training: {
        id: updatedTraining.id,
        title: updatedTraining.title,
        description: updatedTraining.description,
        trainerId: updatedTraining.trainerId,
        trainerIds: resTrainerIds,
        trainerName: trainerNames,
        startDate: updatedTraining.startDate,
        endDate: updatedTraining.endDate,
        capacity: updatedTraining.capacity,
        sequentialLearning: updatedTraining.sequentialLearning
      }
    });
  } catch (error) {
    console.error('Update training error:', error.message);
    res.status(500).json({ error: 'Server error updating training' });
  }
};

const deleteTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const training = await Training.findByPk(id);
    if (!training) return res.status(404).json({ error: 'Training not found' });

    // Find corresponding Course
    const course = await Course.findOne({ where: { trainingProgramId: id } });
    if (course) {
      // 1. CourseTrainerAssignment
      await CourseTrainerAssignment.destroy({ where: { courseId: course.id } });

      // 2. Certificate
      await Certificate.destroy({ where: { courseId: course.id } });

      // 3. Enrollment (course-scoped)
      await Enrollment.destroy({ where: { courseId: course.id } });

      // 4. Lessons & their child models
      const lessons = await Lesson.findAll({ where: { courseId: course.id } });
      const lessonIds = lessons.map(l => l.id);
      if (lessonIds.length > 0) {
        // LessonMaterial
        await LessonMaterial.destroy({ where: { lessonId: lessonIds } });

        // LessonQuiz & QuizProgress
        const lessonQuizzes = await LessonQuiz.findAll({ where: { lessonId: lessonIds } });
        const lessonQuizIds = lessonQuizzes.map(lq => lq.id);
        if (lessonQuizIds.length > 0) {
          await QuizProgress.destroy({ where: { lessonQuizId: lessonQuizIds } });
          await LessonQuiz.destroy({ where: { id: lessonQuizIds } });
        }

        // LessonAssessment & AssessmentSubmission
        const lessonAssessments = await LessonAssessment.findAll({ where: { lessonId: lessonIds } });
        const assessmentIds = lessonAssessments.map(la => la.id);
        if (assessmentIds.length > 0) {
          await AssessmentSubmission.destroy({ where: { assessmentId: assessmentIds } });
          await LessonAssessment.destroy({ where: { id: assessmentIds } });
        }

        // LessonProgress
        await LessonProgress.destroy({ where: { lessonId: lessonIds } });

        // ParticipantTracking
        await ParticipantTracking.destroy({ where: { lessonId: lessonIds } });
      }

      // 5. AIQuiz & its attempts/questions/sessions/results
      const quizzes = await AIQuiz.findAll({ where: { courseId: course.id } });
      const quizIds = quizzes.map(q => q.id);
      if (quizIds.length > 0) {
        // AIQuestion
        await AIQuestion.destroy({ where: { quizId: quizIds } });

        // QuizAttempt & answers/results/sessions
        const attempts = await QuizAttempt.findAll({ where: { quizId: quizIds } });
        const attemptIds = attempts.map(a => a.id);
        if (attemptIds.length > 0) {
          await QuizAnswer.destroy({ where: { attemptId: attemptIds } });
          await QuizResult.destroy({ where: { attemptId: attemptIds } });
          await AssessmentSession.destroy({ where: { attemptId: attemptIds } });
          
          const examSessions = await ExamSession.findAll({ where: { attemptId: attemptIds } });
          const sessionIds = examSessions.map(es => es.id);
          if (sessionIds.length > 0) {
            await Violation.destroy({ where: { sessionId: sessionIds } });
            await ProctorActivity.destroy({ where: { sessionId: sessionIds } });
            await ExamSession.destroy({ where: { id: sessionIds } });
          }
          await QuizAttempt.destroy({ where: { id: attemptIds } });
        }

        // Direct QuizResult, AssessmentSession, ExamSession
        await QuizResult.destroy({ where: { quizId: quizIds } });
        await AssessmentSession.destroy({ where: { quizId: quizIds } });
        
        const directExamSessions = await ExamSession.findAll({ where: { quizId: quizIds } });
        const directSessionIds = directExamSessions.map(es => es.id);
        if (directSessionIds.length > 0) {
          await Violation.destroy({ where: { sessionId: directSessionIds } });
          await ProctorActivity.destroy({ where: { sessionId: directSessionIds } });
          await ExamSession.destroy({ where: { id: directSessionIds } });
        }

        await AIQuiz.destroy({ where: { id: quizIds } });
      }

      // 6. CodingAssessment & its child models
      const codingAssessments = await CodingAssessment.findAll({ where: { courseId: course.id } });
      const codingAssessmentIds = codingAssessments.map(ca => ca.id);
      if (codingAssessmentIds.length > 0) {
        // CodingQuestion & TestCase & CodingSubmission
        const codingQuestions = await CodingQuestion.findAll({ where: { assessmentId: codingAssessmentIds } });
        const codingQuestionIds = codingQuestions.map(cq => cq.id);
        if (codingQuestionIds.length > 0) {
          await TestCase.destroy({ where: { questionId: codingQuestionIds } });
          
          const subms = await CodingSubmission.findAll({ where: { questionId: codingQuestionIds } });
          const submIds = subms.map(s => s.id);
          if (submIds.length > 0) {
            await SubmissionResult.destroy({ where: { submissionId: submIds } });
            await CodingSubmission.destroy({ where: { id: submIds } });
          }
          await CodingQuestion.destroy({ where: { id: codingQuestionIds } });
        }

        // CodingAttempt & submissions & violations
        const codingAttempts = await CodingAttempt.findAll({ where: { assessmentId: codingAssessmentIds } });
        const codingAttemptIds = codingAttempts.map(ca => ca.id);
        if (codingAttemptIds.length > 0) {
          const subms = await CodingSubmission.findAll({ where: { attemptId: codingAttemptIds } });
          const submIds = subms.map(s => s.id);
          if (submIds.length > 0) {
            await SubmissionResult.destroy({ where: { submissionId: submIds } });
            await CodingSubmission.destroy({ where: { id: submIds } });
          }
          await CodingViolation.destroy({ where: { attemptId: codingAttemptIds } });
          await CodingAttempt.destroy({ where: { id: codingAttemptIds } });
        }

        // PlagiarismReport
        await PlagiarismReport.destroy({ where: { assessmentId: codingAssessmentIds } });

        await CodingAssessment.destroy({ where: { id: codingAssessmentIds } });
      }

      // 7. Lessons themselves
      if (lessonIds.length > 0) {
        await Lesson.destroy({ where: { id: lessonIds } });
      }

      // 8. Finally, destroy the Course
      await Course.destroy({ where: { id: course.id } });
    }

    // 9. Legacy / Training-scoped child models
    await Feedback.destroy({ where: { trainingId: id } });
    await Enrollment.destroy({ where: { trainingId: id } });
    await LiveSession.destroy({ where: { trainingId: id } });
    await Note.destroy({ where: { trainingId: id } });
    await AIDocument.destroy({ where: { trainingId: id } });
    await TrainingTrainerAssignment.destroy({ where: { trainingId: id } });

    // 10. Destroy the training itself
    await Training.destroy({ where: { id } });

    res.json({ message: 'Training deleted successfully' });
  } catch (error) {
    console.error('Delete training error:', error.message);
    res.status(500).json({ error: 'Server error deleting training' });
  }
};

const updateTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const trainer = await User.findOne({ where: { id, role: 'TRAINER' } });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    if (email && email !== trainer.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) return res.status(400).json({ error: 'Email already in use' });
    }

    await trainer.update({ name: name || trainer.name, email: email || trainer.email });

    res.json({
      message: 'Trainer updated successfully',
      trainer: { id: trainer.id, name: trainer.name, email: trainer.email, username: trainer.username }
    });
  } catch (error) {
    console.error('Update trainer error:', error.message);
    res.status(500).json({ error: 'Server error updating trainer' });
  }
};

const deleteTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const trainer = await User.findOne({ where: { id, role: 'TRAINER' } });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    const {
      TrainerProfile, TrainingTrainerAssignment, CourseTrainerAssignment,
      Course, Lesson, Note, AIDocument, AIQuiz, CodingAssessment, LiveSession,
      DiscussionPost, LessonMaterial, LessonQuiz, LessonAssessment, AssessmentSubmission,
      LessonProgress, QuizProgress, AIQuestion, QuizAttempt, QuizResult,
      CodingQuestion, TestCase, CodingAttempt, CodingSubmission, SubmissionResult,
      CodingViolation, PlagiarismReport, ParticipantTracking, Certificate,
      Attendance, ExamSession, AssessmentSession
    } = require('../models');
    const { Op } = require('sequelize');

    // A. Coding Assessment cascade
    const codingAssessments = await CodingAssessment.findAll({ where: { trainerId: id }, attributes: ['id'] });
    const assessmentIds = codingAssessments.map(ca => ca.id);
    if (assessmentIds.length > 0) {
      const codingAttempts = await CodingAttempt.findAll({ where: { assessmentId: { [Op.in]: assessmentIds } }, attributes: ['id'] });
      const attemptIds = codingAttempts.map(ca => ca.id);
      if (attemptIds.length > 0) {
        const codingSubmissions = await CodingSubmission.findAll({ where: { attemptId: { [Op.in]: attemptIds } }, attributes: ['id'] });
        const submissionIds = codingSubmissions.map(cs => cs.id);
        if (submissionIds.length > 0) {
          await SubmissionResult.destroy({ where: { submissionId: { [Op.in]: submissionIds } } });
          await CodingSubmission.destroy({ where: { id: { [Op.in]: submissionIds } } });
        }
        await CodingViolation.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
        await CodingAttempt.destroy({ where: { id: { [Op.in]: attemptIds } } });
      }
      const codingQuestions = await CodingQuestion.findAll({ where: { assessmentId: { [Op.in]: assessmentIds } }, attributes: ['id'] });
      const questionIds = codingQuestions.map(cq => cq.id);
      if (questionIds.length > 0) {
        await TestCase.destroy({ where: { questionId: { [Op.in]: questionIds } } });
        await CodingQuestion.destroy({ where: { id: { [Op.in]: questionIds } } });
      }
      await PlagiarismReport.destroy({ where: { assessmentId: { [Op.in]: assessmentIds } } });
      await CodingAssessment.destroy({ where: { id: { [Op.in]: assessmentIds } } });
    }

    // B. Course, Lesson, Material, Quiz cascade
    const courses = await Course.findAll({ where: { trainerId: id }, attributes: ['id'] });
    const courseIds = courses.map(c => c.id);
    const lessons = await Lesson.findAll({ where: { trainerId: id }, attributes: ['id'] });
    const lessonIds = lessons.map(l => l.id);

    const quizzes = await AIQuiz.findAll({
      where: {
        [Op.or]: [
          { courseId: { [Op.in]: courseIds } },
          { lessonId: { [Op.in]: lessonIds } },
          { trainerId: id }
        ]
      },
      attributes: ['id']
    });
    const quizIds = quizzes.map(q => q.id);

    if (quizIds.length > 0) {
      const attempts = await QuizAttempt.findAll({ where: { quizId: { [Op.in]: quizIds } }, attributes: ['id'] });
      const attemptIds = attempts.map(a => a.id);
      if (attemptIds.length > 0) {
        const { QuizAnswer } = require('../models');
        await QuizAnswer.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
        await QuizResult.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
        await QuizProgress.destroy({ where: { lessonQuizId: { [Op.in]: attemptIds } } }).catch(() => {});
        await AssessmentSession.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
        await ExamSession.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
      }
      await Promise.all([
        QuizAttempt.destroy({ where: { quizId: { [Op.in]: quizIds } } }),
        AIQuestion.destroy({  where: { quizId: { [Op.in]: quizIds } } }),
        LessonQuiz.destroy({  where: { quizId: { [Op.in]: quizIds } } }),
        ExamSession.destroy({ where: { quizId: { [Op.in]: quizIds } } }),
        AssessmentSession.destroy({ where: { quizId: { [Op.in]: quizIds } } })
      ]);
      await AIQuiz.destroy({ where: { id: { [Op.in]: quizIds } } });
    }

    const assessments = lessonIds.length === 0 ? [] : await LessonAssessment.findAll({
      where: { lessonId: { [Op.in]: lessonIds } }, attributes: ['id'],
    });
    const lessonAssessmentIds = assessments.map(a => a.id);
    if (lessonAssessmentIds.length > 0) {
      await AssessmentSubmission.destroy({ where: { assessmentId: { [Op.in]: lessonAssessmentIds } } });
      await LessonAssessment.destroy({ where: { id: { [Op.in]: lessonAssessmentIds } } });
    }
    
    if (lessonIds.length > 0) {
      await Promise.all([
        LessonMaterial.destroy({   where: { lessonId:   { [Op.in]: lessonIds } } }),
        LessonProgress.destroy({   where: { lessonId:   { [Op.in]: lessonIds } } }),
        LessonQuiz.destroy({       where: { lessonId:   { [Op.in]: lessonIds } } }),
        ParticipantTracking.destroy({ where: { lessonId: { [Op.in]: lessonIds } } }),
      ]);
      await Lesson.destroy({ where: { id: { [Op.in]: lessonIds } } });
    }

    if (courseIds.length > 0) {
      await Promise.all([
        Enrollment.destroy({   where: { courseId: { [Op.in]: courseIds } } }),
        CourseTrainerAssignment.destroy({ where: { courseId: { [Op.in]: courseIds } } }),
        Certificate.destroy({ where: { courseId: { [Op.in]: courseIds } } })
      ]);
      await Course.destroy({ where: { id: { [Op.in]: courseIds } } });
    }

    // C. Standalone Trainer records cleanup
    const liveSessions = await LiveSession.findAll({ where: { trainerId: id }, attributes: ['id'] });
    const liveSessionIds = liveSessions.map(ls => ls.id);
    if (liveSessionIds.length > 0) {
      await Attendance.destroy({ where: { sessionId: { [Op.in]: liveSessionIds } } });
    }
    await Attendance.destroy({ where: { userId: id } });

    // Clean up nested replies and posts
    const posts = await DiscussionPost.findAll({ where: { userId: id }, attributes: ['id'] });
    const postIds = posts.map(p => p.id);
    if (postIds.length > 0) {
      await DiscussionPost.update({ parentId: null }, { where: { parentId: { [Op.in]: postIds } } });
    }
    await DiscussionPost.destroy({ where: { userId: id } });

    await Promise.all([
      TrainerProfile.destroy({ where: { userId: id } }),
      TrainingTrainerAssignment.destroy({ where: { trainerId: id } }),
      CourseTrainerAssignment.destroy({ where: { trainerId: id } }),
      Note.destroy({ where: { trainerId: id } }),
      LiveSession.destroy({ where: { trainerId: id } }),
      AIDocument.destroy({ where: { trainerId: id } }),
      Notification.destroy({ where: { userId: id } })
    ]);

    // D. Update legacy Training & destroy User
    await Training.update({ trainerId: null }, { where: { trainerId: id } });
    await User.destroy({ where: { id } });

    res.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Delete trainer error:', error.stack || error.message);
    res.status(500).json({ error: 'Server error deleting trainer' });
  }
};

const getStats = async (req, res) => {
  try {
    const totalTrainings = await Training.count();
    const totalTrainers = await User.count({ where: { role: 'TRAINER' } });
    const totalParticipants = await User.count({ where: { role: 'PARTICIPANT' } });
    const totalEnrollments = await Enrollment.count({ where: { status: 'ENROLLED' } });
    const totalFeedbacks = await Feedback.count();
    
    // Pending counts
    const pendingParticipants = await User.count({ 
      where: { role: 'PARTICIPANT', status: 'PENDING' } 
    });
    const { Note } = require('../models');
    const pendingNotes = await Note.count({ where: { status: 'PENDING' } });
    
    // Completed trainings (trainings that have ended)
    const now = new Date();
    const completedTrainings = await Training.count({
      where: { endDate: { [require('sequelize').Op.lt]: now } }
    });
    const activeTrainings = totalTrainings - completedTrainings;

    // Feedback stats
    const feedbacks = await Feedback.findAll({ 
      attributes: ['trainerRating', 'subjectRating'] 
    });
    const avgTrainerRating = feedbacks.length > 0
      ? (feedbacks.reduce((s, f) => s + f.trainerRating, 0) / feedbacks.length).toFixed(1) : 0;
    const avgSubjectRating = feedbacks.length > 0
      ? (feedbacks.reduce((s, f) => s + f.subjectRating, 0) / feedbacks.length).toFixed(1) : 0;
    const satisfactionScore = feedbacks.length > 0
      ? (((parseFloat(avgTrainerRating) + parseFloat(avgSubjectRating)) / 2)).toFixed(1)
      : 0;

    // Rating distribution (for charts)
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => {
      ratingDistribution[f.trainerRating] = (ratingDistribution[f.trainerRating] || 0) + 1;
    });

    // Enrollment rate
    const enrollmentRate = totalParticipants > 0 
      ? ((totalEnrollments / totalParticipants) * 100).toFixed(1) 
      : 0;

    res.json({ 
      success: true,
      // Flat properties for backward compatibility
      totalTrainings,
      completedTrainings,
      activeTrainings,
      totalTrainers,
      totalParticipants,
      pendingParticipants,
      totalEnrollments,
      totalFeedbacks,
      pendingNotes,
      avgTrainerRating,
      avgSubjectRating,
      satisfactionScore,
      ratingDistribution,
      enrollmentRate,
      // New data wrapper
      data: {
        totalTrainings,
        completedTrainings,
        activeTrainings,
        totalTrainers,
        totalParticipants,
        pendingParticipants,
        totalEnrollments,
        totalFeedbacks,
        pendingNotes,
        avgTrainerRating,
        avgSubjectRating,
        satisfactionScore,
        ratingDistribution,
        enrollmentRate
      }
    });

  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching stats' 
    });
  }
};

const getParticipants = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { search = '', status = '', limit = 50, offset = 0 } = req.query;
    
    const where = { role: 'PARTICIPANT' };
    
    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Status filter
    if (status) {
      where.status = status;
    }

    const participants = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await User.count({ where });

    const formattedParticipants = participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      username: p.username,
      status: p.status,
      joinedAt: p.createdAt || p.dataValues?.created_at
    }));

    res.json({ 
      success: true,
      participants: formattedParticipants,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });

  } catch (error) {
    console.error('Get participants error:', error.message, error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching participants' 
    });
  }
};

const sendReminders = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const training = await Training.findByPk(trainingId);
    if (!training) return res.status(404).json({ error: 'Training not found' });

    const enrollments = await Enrollment.findAll({
      where: { trainingId, status: 'ENROLLED' },
      attributes: ['participantId']
    });

    const participantIds = enrollments.map(e => e.participantId);
    const feedbacks = await Feedback.findAll({
      where: { trainingId },
      attributes: ['participantId']
    });
    const submittedIds = feedbacks.map(f => f.participantId);
    const pendingIds = participantIds.filter(id => !submittedIds.includes(id));

    if (pendingIds.length === 0) {
      return res.json({ message: 'No pending feedbacks for this training.' });
    }

    const notifications = pendingIds.map(userId => ({
      userId,
      message: `Reminder: Please submit your feedback for the training "${training.title}".`,
      isRead: false
    }));

    await Notification.bulkCreate(notifications);
    res.json({ message: `Sent ${notifications.length} reminders.` });
  } catch (error) {
    console.error('Send reminders error:', error.message);
    res.status(500).json({ error: 'Server error sending reminders' });
  }
};

const deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await User.findOne({ where: { id, role: 'PARTICIPANT' } });
    if (!participant) return res.status(404).json({ error: 'Participant not found' });

    const {
      Enrollment, Feedback, Notification, ParticipantProfile,
      DeviceFingerprint, ParticipantTracking, Certificate, Attendance, DiscussionPost,
      LessonProgress, QuizProgress, QuizAttempt, QuizAnswer, QuizResult, AssessmentSession,
      ExamSession, Violation, CodingAttempt, CodingSubmission, SubmissionResult, CodingViolation
    } = require('../models');
    const { Op } = require('sequelize');

    // A. Quiz attempts, answers, results cleanup
    const attempts = await QuizAttempt.findAll({ where: { participantId: id }, attributes: ['id'] });
    const attemptIds = attempts.map(a => a.id);
    if (attemptIds.length > 0) {
      await QuizAnswer.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
      await QuizResult.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
      await QuizProgress.destroy({ where: { lessonQuizId: { [Op.in]: attemptIds } } }).catch(() => {});
      await AssessmentSession.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
      await ExamSession.destroy({ where: { attemptId: { [Op.in]: attemptIds } } });
    }

    // B. Exam Sessions & Violations
    const examSessions = await ExamSession.findAll({ where: { participantId: id }, attributes: ['id'] });
    const sessionIds = examSessions.map(e => e.id);
    if (sessionIds.length > 0) {
      await Violation.destroy({ where: { sessionId: { [Op.in]: sessionIds } } });
      await ExamSession.destroy({ where: { id: { [Op.in]: sessionIds } } });
    }
    await Violation.destroy({ where: { participantId: id } });
    await AssessmentSession.destroy({ where: { participantId: id } });

    // C. Coding Attempt cleanup
    if (typeof CodingAttempt !== 'undefined') {
      const codingAttempts = await CodingAttempt.findAll({ where: { participantId: id }, attributes: ['id'] });
      const codingAttemptIds = codingAttempts.map(ca => ca.id);
      if (codingAttemptIds.length > 0) {
        const codingSubmissions = await CodingSubmission.findAll({ where: { attemptId: { [Op.in]: codingAttemptIds } }, attributes: ['id'] });
        const submissionIds = codingSubmissions.map(cs => cs.id);
        if (submissionIds.length > 0) {
          await SubmissionResult.destroy({ where: { submissionId: { [Op.in]: submissionIds } } });
          await CodingSubmission.destroy({ where: { id: { [Op.in]: submissionIds } } });
        }
        await CodingViolation.destroy({ where: { attemptId: { [Op.in]: codingAttemptIds } } });
        await CodingAttempt.destroy({ where: { id: { [Op.in]: codingAttemptIds } } });
      }
      await CodingSubmission.destroy({ where: { participantId: id } }).catch(() => {});
    }

    // D. Discussion posts nesting
    const posts = await DiscussionPost.findAll({ where: { userId: id }, attributes: ['id'] });
    const postIds = posts.map(p => p.id);
    if (postIds.length > 0) {
      await DiscussionPost.update({ parentId: null }, { where: { parentId: { [Op.in]: postIds } } });
    }
    await DiscussionPost.destroy({ where: { userId: id } });

    // E. General Student records cleanup
    await Promise.all([
      Notification.destroy({ where: { userId: id } }),
      ParticipantProfile.destroy({ where: { userId: id } }),
      DeviceFingerprint.destroy({ where: { userId: id } }),
      ParticipantTracking.destroy({ where: { userId: id } }),
      Certificate.destroy({ where: { userId: id } }),
      Attendance.destroy({ where: { userId: id } }),
      LessonProgress.destroy({ where: { participantId: id } }),
      Feedback.destroy({ where: { participantId: id } }),
      Enrollment.destroy({ where: { participantId: id } }),
      QuizAttempt.destroy({ where: { participantId: id } })
    ]);

    // F. Destroy User
    await User.destroy({ where: { id } });

    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Delete participant error:', error.stack || error.message);
    res.status(500).json({ error: 'Server error deleting participant' });
  }
};

const exportFeedbacksCSV = async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({
      include: [
        { model: Training, as: 'training', attributes: ['id', 'title'], include: [{ model: User, as: 'trainer', attributes: ['name'] }] },
        { model: User, as: 'participant', attributes: ['id', 'name', 'email'] }
      ],
      order: [['submitted_at', 'DESC']]
    });

    const rows = [
      ['ID', 'Training', 'Trainer', 'Participant', 'Trainer Rating', 'Subject Rating', 'Comments', 'Anonymous', 'Date'].join(',')
    ];
    feedbacks.forEach(f => {
      const pName = f.anonymous ? 'Anonymous' : (f.participant?.name || '');
      const row = [
        f.id,
        `"${f.training?.title || ''}"`,
        `"${f.training?.trainer?.name || ''}"`,
        `"${pName}"`,
        f.trainerRating,
        f.subjectRating,
        `"${(f.comments || '').replace(/"/g, "'")}"`,
        f.anonymous ? 'Yes' : 'No',
        f.submitted_at ? new Date(f.submitted_at).toLocaleDateString('en-IN') : ''
      ].join(',');
      rows.push(row);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback_export.csv"');
    res.send(rows.join('\n'));
  } catch (error) {
    console.error('Export CSV error:', error.message);
    res.status(500).json({ error: 'Server error exporting feedbacks' });
  }
};

const getTrainingStats = async (req, res) => {
  try {
    const trainings = await Training.findAll({
      include: [{ model: User, as: 'trainer', attributes: ['name'], required: false }],
      order: [['id', 'DESC']]
    });

    const result = await Promise.all(trainings.map(async t => {
      const enrolledCount = await Enrollment.count({ where: { trainingId: t.id, status: 'ENROLLED' } });
      const feedbackCount = await Feedback.count({ where: { trainingId: t.id } });
      const feedbacks = await Feedback.findAll({ where: { trainingId: t.id }, attributes: ['trainerRating', 'subjectRating'] });
      const avgTrainer = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.trainerRating, 0) / feedbacks.length).toFixed(1) : null;
      const avgSubject = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.subjectRating, 0) / feedbacks.length).toFixed(1) : null;
      const now = new Date();
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const status = now < start ? 'Upcoming' : now > end ? 'Completed' : 'Ongoing';
      return {
        id: t.id, title: t.title, trainerName: t.trainer?.name || 'Unassigned',
        startDate: t.startDate, endDate: t.endDate, capacity: t.capacity,
        enrolledCount, feedbackCount, avgTrainerRating: avgTrainer, avgSubjectRating: avgSubject, status
      };
    }));

    res.json({ trainings: result });
  } catch (error) {
    console.error('Training stats error:', error.message);
    res.status(500).json({ error: 'Server error fetching training stats' });
  }
};

const getPendingParticipants = async (req, res) => {
  try {
    const pendingParticipants = await User.findAll({
      where: { role: 'PARTICIPANT', status: 'PENDING' },
      attributes: { exclude: ['password'] },
      order: [['id', 'DESC']]
    });

    const formattedParticipants = pendingParticipants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      username: p.username,
      appliedAt: p.createdAt
    }));

    res.json({ participants: formattedParticipants, total: formattedParticipants.length });
  } catch (error) {
    console.error('Get pending participants error:', error.message);
    res.status(500).json({ error: 'Server error fetching pending participants' });
  }
};

const approveParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await User.findOne({ where: { id, role: 'PARTICIPANT', status: 'PENDING' } });
    
    if (!participant) {
      return res.status(404).json({ error: 'Pending participant not found' });
    }

    await participant.update({ status: 'APPROVED' });

    const io = req.app.get('io');

    // Log activity
    await ActivityService.logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Admin',
      action: 'USER_APPROVED',
      entityType: 'User',
      entityId: participant.id,
      details: { targetUserName: participant.name }
    }, io);

    // Notify user
    await Notification.create({
      userId: participant.id,
      message: 'Your account has been approved. You can now log in.',
      type: 'APPROVAL',
      isRead: false
    });

    res.json({
      message: 'Participant approved successfully',
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        status: participant.status
      }
    });
  } catch (error) {
    console.error('Approve participant error:', error.message);
    res.status(500).json({ error: 'Server error approving participant' });
  }
};

const rejectParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await User.findOne({ where: { id, role: 'PARTICIPANT', status: 'PENDING' } });
    
    if (!participant) {
      return res.status(404).json({ error: 'Pending participant not found' });
    }

    // Delete all related data
    await Enrollment.destroy({ where: { participantId: id } });
    await Feedback.destroy({ where: { participantId: id } });
    await User.destroy({ where: { id } });

    res.json({ message: 'Participant rejected and removed successfully' });
  } catch (error) {
    console.error('Reject participant error:', error.message);
    res.status(500).json({ error: 'Server error rejecting participant' });
  }
};

module.exports = { updateTraining, deleteTraining, updateTrainer, deleteTrainer, getStats, getParticipants, sendReminders, deleteParticipant, exportFeedbacksCSV, getTrainingStats, getPendingParticipants, approveParticipant, rejectParticipant };