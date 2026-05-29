/**
 * Centralized API configuration.
 *
 * ALL frontend code MUST use these constants — never hardcode
 * 'http://localhost:3001' anywhere else. This allows the backend
 * URL to be changed via the VITE_API_URL environment variable.
 *
 * Architecture:
 *   Frontend (5173) → Node Backend (3001) → Python AI Service (8000)
 *
 * The frontend NEVER calls the Python AI service directly.
 */

/** Base origin of the Node backend — no trailing slash, no /api */
const BACKEND_ORIGIN = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')   // strip /api if accidentally included
  : 'http://localhost:3001';

/** Base for all REST API calls: http://localhost:3001/api */
const API_BASE = `${BACKEND_ORIGIN}/api`;

/**
 * Resolve a server-relative asset path (e.g. /uploads/trainer/photo.jpg)
 * to an absolute URL that the browser can load.
 *
 * Usage:  <img src={assetUrl(trainer.profile.imagePath)} />
 */
export const assetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${BACKEND_ORIGIN}${path}`;
};

export const API = {
  LOGIN:           `${API_BASE}/auth/login`,
  REGISTER:        `${API_BASE}/auth/register`,
  CHANGE_PASSWORD: `${API_BASE}/auth/change-password`,

  FORGOT_PASSWORD: {
    SEND_OTP:   `${API_BASE}/auth/forgot-password/send-otp`,
    VERIFY_OTP: `${API_BASE}/auth/forgot-password/verify-otp`,
    RESET:      `${API_BASE}/auth/forgot-password/reset`
  },

  ADMIN: {
    CREATE_TRAINER:  `${API_BASE}/admin/create-trainer`,
    TRAININGS:       `${API_BASE}/admin/trainings`,
    TRAINERS:        `${API_BASE}/admin/trainers`,
    PARTICIPANTS:    `${API_BASE}/admin/participants`,
    DELETE_TRAINING: `${API_BASE}/admin/delete-training`,
    NOTES:           `${API_BASE}/notes/admin/notes`
  },

  PARTICIPANT: {
    TRAININGS:     `${API_BASE}/trainings`,
    ENROLL:        `${API_BASE}/participant/enroll`,
    MY_ENROLLMENTS:`${API_BASE}/participant/enrollments`
  },

  FEEDBACK: {
    SUBMIT: `${API_BASE}/feedback`
  },

  NOTES: {
    ADMIN: `${API_BASE}/notes/admin/notes`
  },

  TRAININGS: {
    LIST: `${API_BASE}/trainer/trainings`
  },

  /** Backend health-check proxy for the AI microservice */
  AI_HEALTH: `${API_BASE}/ai/health`,

  AI_QUIZ: {
    TRAINER_UPLOAD:     `${API_BASE}/ai-quiz/trainer/upload-document`,
    TRAINER_QUIZZES:    `${API_BASE}/ai-quiz/trainer/quizzes`,
    TRAINER_UPDATE_QUIZ:(id) => `${API_BASE}/ai-quiz/trainer/quiz/${id}`,
    PARTICIPANT_QUIZZES:`${API_BASE}/ai-quiz/participant/quizzes`,
    START:              (quizId)   => `${API_BASE}/ai-quiz/participant/start/${quizId}`,
    SUBMIT:             (attemptId)=> `${API_BASE}/ai-quiz/participant/submit/${attemptId}`,
    LEADERBOARD:        (quizId)   => `${API_BASE}/ai-quiz/leaderboard/${quizId}`
  },

  /** Lesson workflow: lessons + quiz/assessment gating, results & dashboards */
  LESSONS: {
    // Trainer authoring
    CREATE:             `${API_BASE}/lessons`,
    TRAINER_LIST:       `${API_BASE}/lessons/trainer`,
    ATTACH_QUIZ:        (lessonId) => `${API_BASE}/lessons/${lessonId}/quizzes`,
    CREATE_ASSESSMENT:  (lessonId) => `${API_BASE}/lessons/${lessonId}/assessments`,
    // Trainer dashboard + publishing
    DASHBOARD:          (lessonId) => `${API_BASE}/lessons/${lessonId}/dashboard`,
    PUBLISH_QUIZ:       (lessonQuizId) => `${API_BASE}/lessons/quizzes/${lessonQuizId}/publish`,
    // Trainer assessment review
    SUBMISSIONS:        (assessmentId) => `${API_BASE}/lessons/assessments/${assessmentId}/submissions`,
    GRADE:              (submissionId) => `${API_BASE}/lessons/submissions/${submissionId}/grade`,
    PUBLISH_ASSESSMENT: (submissionId) => `${API_BASE}/lessons/submissions/${submissionId}/publish`,
    // Participant
    PARTICIPANT_LIST:   `${API_BASE}/lessons/participant`,
    VIEW_CONTENT:       (lessonId) => `${API_BASE}/lessons/${lessonId}/view`,
    COMPLETE_QUIZ:      (lessonQuizId) => `${API_BASE}/lessons/quizzes/${lessonQuizId}/complete`,
    SUBMIT_ASSESSMENT:  (assessmentId) => `${API_BASE}/lessons/assessments/${assessmentId}/submit`,
    QUIZ_RESULT:        (lessonQuizId) => `${API_BASE}/lessons/quizzes/${lessonQuizId}/result`,
    ASSESSMENT_RESULT:  (assessmentId) => `${API_BASE}/lessons/assessments/${assessmentId}/result`
  }
};

export { API_BASE, BACKEND_ORIGIN };