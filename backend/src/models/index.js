const { sequelize } = require('../config/db');
const User = require('./user');
const Training = require('./training');
const TrainerProfile = require('./trainerProfile');
const Enrollment = require('./enrollment');
const Feedback = require('./feedback');

const Notification = require('./notification');
const SurveyQuestion = require('./surveyQuestion');
const SurveyAnswer = require('./surveyAnswer');
const Note = require('./note');
const ActivityLog = require('./activityLog');
const LiveSession = require('./liveSession');
const Attendance = require('./attendance');
const ChatMessage = require('./chatMessage');
const ParticipantProfile = require('./participantProfile');

const AIDocument = require('./aiDocument');
const AIQuiz = require('./aiQuiz');
const AIQuestion = require('./aiQuestion');
const QuizAttempt = require('./quizAttempt');
const QuizAnswer = require('./quizAnswer');
const QuizResult = require('./quizResult');

const PasswordResetOtp = require('./PasswordResetOtp');
const AssessmentSession = require('./AssessmentSession');

// Lesson workflow module (lessons + quiz/assessment gating + progress)
const Lesson = require('./lesson');
const LessonQuiz = require('./lessonQuiz');
const LessonAssessment = require('./lessonAssessment');
const AssessmentSubmission = require('./assessmentSubmission');
const QuizProgress = require('./quizProgress');
const LessonProgress = require('./lessonProgress');

// Proctoring module
const ExamSession = require('./examSession');
const Violation = require('./violation');
const DeviceFingerprint = require('./deviceFingerprint');
const ProctorActivity = require('./proctorActivity');

// --- Core LMS Associations ---

// User <-> TrainerProfile
User.hasOne(TrainerProfile, { foreignKey: 'userId', as: 'profile' });
TrainerProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Training <-> Trainer (User)
Training.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
User.hasMany(Training, { foreignKey: 'trainerId', as: 'trainings' });

// Enrollment associations
Enrollment.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });
Enrollment.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
User.hasMany(Enrollment, { foreignKey: 'participantId', as: 'enrollments' });
Training.hasMany(Enrollment, { foreignKey: 'trainingId', as: 'enrollments' });

// Feedback associations
Feedback.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
Feedback.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });
Training.hasMany(Feedback, { foreignKey: 'trainingId', as: 'feedbacks' });
User.hasMany(Feedback, { foreignKey: 'participantId', as: 'feedbacks' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Note associations
Note.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
Note.belongsTo(Training, { foreignKey: 'trainingId', as: 'training', required: false });

// ParticipantProfile (1-1 with User)
User.hasOne(ParticipantProfile, { foreignKey: 'userId', as: 'participantProfile' });
ParticipantProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- AI Quiz System ---
AIDocument.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
AIDocument.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });

AIQuiz.belongsTo(AIDocument, { foreignKey: 'documentId', as: 'document' });
AIQuiz.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
AIQuiz.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
AIQuiz.hasMany(AIQuestion, { foreignKey: 'quizId', as: 'questions' });

AIQuestion.belongsTo(AIQuiz, { foreignKey: 'quizId', as: 'quiz' });

QuizAttempt.belongsTo(AIQuiz, { foreignKey: 'quizId', as: 'quiz' });
QuizAttempt.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });
QuizAttempt.hasMany(QuizAnswer, { foreignKey: 'attemptId', as: 'answers' });
QuizAttempt.hasOne(QuizResult, { foreignKey: 'attemptId', as: 'result' });

QuizAnswer.belongsTo(QuizAttempt, { foreignKey: 'attemptId', as: 'attempt' });
QuizAnswer.belongsTo(AIQuestion, { foreignKey: 'questionId', as: 'question' });

QuizResult.belongsTo(QuizAttempt, { foreignKey: 'attemptId', as: 'attempt' });
QuizResult.belongsTo(AIQuiz, { foreignKey: 'quizId', as: 'quiz' });
QuizResult.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });

// --- Proctoring Associations ---
ExamSession.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });
ExamSession.belongsTo(AIQuiz, { foreignKey: 'quizId', as: 'quiz' });
ExamSession.belongsTo(QuizAttempt, { foreignKey: 'attemptId', as: 'attempt' });
ExamSession.belongsTo(DeviceFingerprint, { foreignKey: 'deviceFingerprintId', as: 'device' });
ExamSession.hasMany(Violation, { foreignKey: 'sessionId', as: 'violations' });
ExamSession.hasMany(ProctorActivity, { foreignKey: 'sessionId', as: 'activities' });

Violation.belongsTo(ExamSession, { foreignKey: 'sessionId', as: 'session' });
Violation.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });

ProctorActivity.belongsTo(ExamSession, { foreignKey: 'sessionId', as: 'session' });

DeviceFingerprint.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(DeviceFingerprint, { foreignKey: 'userId', as: 'devices' });
User.hasMany(ExamSession, { foreignKey: 'participantId', as: 'examSessions' });

// --- Secure Assessment Session lock (separate from proctoring module) ---
AssessmentSession.belongsTo(QuizAttempt, { foreignKey: 'attemptId', as: 'attempt' });
AssessmentSession.belongsTo(AIQuiz, { foreignKey: 'quizId', as: 'quiz' });
AssessmentSession.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });
AssessmentSession.belongsTo(User, { foreignKey: 'resetByAdmin', as: 'resetAdmin' });
QuizAttempt.hasOne(AssessmentSession, { foreignKey: 'attemptId', as: 'assessmentSession' });
User.hasMany(AssessmentSession, { foreignKey: 'participantId', as: 'assessmentSessions' });

// --- Lesson Workflow Associations ---
Lesson.belongsTo(Training, { foreignKey: 'trainingId', as: 'training' });
Lesson.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
Training.hasMany(Lesson, { foreignKey: 'trainingId', as: 'lessons' });

Lesson.hasMany(LessonQuiz, { foreignKey: 'lessonId', as: 'quizzes' });
LessonQuiz.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });
LessonQuiz.belongsTo(AIQuiz, { foreignKey: 'quizId', as: 'quiz' });

Lesson.hasMany(LessonAssessment, { foreignKey: 'lessonId', as: 'assessments' });
LessonAssessment.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });

LessonAssessment.hasMany(AssessmentSubmission, { foreignKey: 'assessmentId', as: 'submissions' });
AssessmentSubmission.belongsTo(LessonAssessment, { foreignKey: 'assessmentId', as: 'assessment' });
AssessmentSubmission.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });

LessonQuiz.hasMany(QuizProgress, { foreignKey: 'lessonQuizId', as: 'progress' });
QuizProgress.belongsTo(LessonQuiz, { foreignKey: 'lessonQuizId', as: 'lessonQuiz' });
QuizProgress.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });

Lesson.hasMany(LessonProgress, { foreignKey: 'lessonId', as: 'progress' });
LessonProgress.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });
LessonProgress.belongsTo(User, { foreignKey: 'participantId', as: 'participant' });

module.exports = {
  sequelize,
  User,
  Training,
  TrainerProfile,
  Enrollment,
  Feedback,
  Notification,
  SurveyQuestion,
  SurveyAnswer,
  Note,
  ActivityLog,
  LiveSession,
  Attendance,
  ChatMessage,
  ParticipantProfile,
  AIDocument,
  AIQuiz,
  AIQuestion,
  QuizAttempt,
  QuizAnswer,
  QuizResult,
  // Proctoring
  ExamSession,
  Violation,
  DeviceFingerprint,
  ProctorActivity,
  PasswordResetOtp,
  // Secure Assessment session lock
  AssessmentSession,
  // Lesson workflow module
  Lesson,
  LessonQuiz,
  LessonAssessment,
  AssessmentSubmission,
  QuizProgress,
  LessonProgress
};