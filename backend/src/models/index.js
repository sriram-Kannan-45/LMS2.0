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

const AIDocument = require('./aiDocument');
const AIQuiz = require('./aiQuiz');
const AIQuestion = require('./aiQuestion');
const QuizAttempt = require('./quizAttempt');
const QuizAnswer = require('./quizAnswer');
const QuizResult = require('./quizResult');

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
  AIDocument,
  AIQuiz,
  AIQuestion,
  QuizAttempt,
  QuizAnswer,
  QuizResult
};