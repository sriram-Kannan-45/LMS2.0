import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../api/api';
import { getAuthHeaders } from '../api/request';
import QuizTaking from '../components/QuizTaking';
import Leaderboard from '../components/Leaderboard';
import QuizLayout from '../components/QuizLayout';
import '../styles/quiz-dashboard.css';

function ParticipantQuizzes({ user, activeTab, onTabChange, onLogout }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai-quiz/participant/quizzes`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleStartQuiz = async (quizId) => {
    try {
      setError('');
      const res = await fetch(`${API_BASE}/ai-quiz/participant/start/${quizId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start quiz');

      const quizWithQuestions = data.quiz;
      if (!quizWithQuestions || !quizWithQuestions.questions || quizWithQuestions.questions.length === 0) {
        throw new Error('This quiz has no questions. Please contact your trainer.');
      }

      setActiveQuiz(quizWithQuestions);
      setAttemptId(data.attemptId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuizSubmit = (result) => {
    setQuizResult(result);
    setActiveQuiz(null);
    setAttemptId(null);
  };

  const fetchLeaderboard = async (quizId) => {
    try {
      const res = await fetch(`${API_BASE}/ai-quiz/leaderboard/${quizId}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setLeaderboardData(data.leaderboard || []);
      setShowLeaderboard(true);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  if (activeQuiz && attemptId) {
    return (
      <QuizLayout user={user} activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout}
        title="Quiz Taking"
        subtitle="Answer all questions carefully"
      >
        <QuizTaking
          quizId={activeQuiz.id}
          attemptId={attemptId}
          quizData={activeQuiz}
          onSubmit={handleQuizSubmit}
        />
      </QuizLayout>
    );
  }

  if (quizResult) {
    return (
      <QuizLayout user={user} activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout}
        title="Quiz Results"
        subtitle="See how you performed"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="quiz-result"
        >
          <div className="quiz-result-icon">🎉</div>
          <h2>Quiz Completed!</h2>
          <div className="quiz-result-score">
            <div className="quiz-score-value">{quizResult.percentage?.toFixed(1) || 0}%</div>
            <div className="quiz-score-label">Your Score</div>
          </div>
          <div className="quiz-result-details">
            <div className="quiz-result-detail-item">
              <span className="quiz-detail-label">Total Score:</span>
              <span className="quiz-detail-value">{quizResult.totalScore}/{quizResult.maxScore}</span>
            </div>
            <div className="quiz-result-detail-item">
              <span className="quiz-detail-label">Rank:</span>
              <span className="quiz-detail-value">#{quizResult.rank || 'N/A'}</span>
            </div>
          </div>
          <div className="quiz-result-actions">
            <button className="btn btn-primary" onClick={() => setQuizResult(null)}>
              Back to Quizzes
            </button>
            <button className="btn btn-secondary" onClick={() => fetchLeaderboard(quizResult.quizId)}>
              🏆 Leaderboard
            </button>
          </div>
        </motion.div>
      </QuizLayout>
    );
  }

  return (
    <QuizLayout user={user} activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout}
      title="Available Quizzes"
      subtitle="Test your knowledge with AI-generated quizzes"
    >
      {error && <div className="quiz-error">{error}</div>}

      {loading ? (
        <div className="quiz-loading">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="quiz-empty">
          <div className="quiz-empty-icon">📚</div>
          <p>No quizzes available yet. Check back later!</p>
        </div>
      ) : (
        <div className="quizzes-grid">
          {quizzes.map((quiz, idx) => (
            <motion.div
              key={quiz.id}
              className="quiz-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <div className="quiz-card-header">
                <h3>{quiz.title}</h3>
                <span className={`difficulty-badge ${quiz.difficulty?.toLowerCase()}`}>
                  {quiz.difficulty}
                </span>
              </div>
              <div className="quiz-meta">
                <span>📝 {quiz.questions?.length || 0} questions</span>
                <span>⏱️ {quiz.timeLimit || 30} min</span>
                {quiz.training && <span>📚 {quiz.training.title}</span>}
              </div>
              <div className="quiz-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleStartQuiz(quiz.id)}
                >
                  Start Quiz
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => fetchLeaderboard(quiz.id)}
                >
                  🏆 Leaderboard
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </QuizLayout>
  );
}

export default ParticipantQuizzes;
