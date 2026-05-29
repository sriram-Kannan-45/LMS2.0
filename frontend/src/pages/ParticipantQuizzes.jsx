import AIQuizzesDashboard from '../components/ai-quizzes/AIQuizzesDashboard'

/**
 * Standalone AI Quizzes route (/participant/quizzes)
 *
 * The secure assessment flow (consent + fullscreen + live exam) is fully
 * orchestrated inside <AIQuizzesDashboard /> now. We pass an empty
 * onStartQuiz so the dashboard's external tracking callback exists but
 * doesn't navigate away.
 */
export default function ParticipantQuizzes({ user, onLogout }) {
  return (
    <AIQuizzesDashboard
      user={user}
      onStartQuiz={() => { /* tracking only — flow handled internally */ }}
      onLogout={onLogout}
      embedded={false}
    />
  )
}
