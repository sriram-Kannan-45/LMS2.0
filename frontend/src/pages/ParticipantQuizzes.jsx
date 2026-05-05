import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_BASE } from '../api/api';
import { getAuthHeaders } from '../api/request';
import QuizTaking from '../components/QuizTaking';
import Leaderboard from '../components/Leaderboard';
import './ParticipantQuizzes.css';

function ParticipantQuizzes({ user }) {
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

      // Use the quiz returned by the start API (includes questions)
      const quizWithQuestions = data.quiz;
      if (!quizWithQuestions || !quizWithQuestions.questions || quizWithQuestions.questions.length === 0) {
        throw new Error('This quiz has no questions. Please contact your trainer.');
      }

      console.log(`[ParticipantQuizzes] Starting quiz "${quizWithQuestions.title}" with ${quizWithQuestions.questions.length} questions`);
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
      <QuizTaking
        quizId={activeQuiz.id}
        attemptId={attemptId}
        quizData={activeQuiz}
        onSubmit={handleQuizSubmit}
      />
    );
  }

  if (quizResult) {
    return (
      <div className="quiz-result-page">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="result-card"
        >
          <div className="result-icon">🎉</div>
          <h2>Quiz Completed!</h2>
          <div className="result-score">
            <div className="score-value">{quizResult.percentage?.toFixed(1) || 0}%</div>
            <div className="score-label">Your Score</div>
          </div>
          <div className="result-details">
            <div className="detail-item">
              <span className="detail-label">Total Score:</span>
              <span className="detail-value">{quizResult.totalScore}/{quizResult.maxScore}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Rank:</span>
              <span className="detail-value">#{quizResult.rank || 'N/A'}</span>
            </div>
          </div>
          <div className="result-actions">
            <button className="btn btn-primary" onClick={() => setQuizResult(null)}>
              Back to Quizzes
            </button>
            <button className="btn btn-secondary" onClick={() => fetchLeaderboard(quizResult.quizId)}>
              View Leaderboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="participant-quizzes">
      <div className="quizzes-header">
        <h2>Available Quizzes</h2>
        <p className="subtitle">Test your knowledge with AI-generated quizzes</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="empty-state">
          <p>No quizzes available yet. Check back later!</p>
        </div>
      ) : (
        <div className="quizzes-grid">
          {quizzes.map(quiz => (
            <motion.div
              key={quiz.id}
              className="quiz-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="quiz-card-header">
                <h3>{quiz.title}</h3>
                <span className={`difficulty-badge ${quiz.difficulty?.toLowerCase()}`}>
                  {quiz.difficulty}
                </span>
              </div>
              <div className="quiz-card-meta">
                <span>❓ {quiz.questions?.length || 0} questions</span>
                <span>⏱️ {quiz.timeLimit || 30} min</span>
                {quiz.training && <span>📚 {quiz.training.title}</span>}
              </div>
              <div className="quiz-card-actions">
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

      {showLeaderboard && (
        <div className="leaderboard-modal">
          <div className="leaderboard-overlay" onClick={() => setShowLeaderboard(false)} />
          <motion.div
            className="leaderboard-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button className="close-btn" onClick={() => setShowLeaderboard(false)}>✕</button>
            <Leaderboard data={leaderboardData} />
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ParticipantQuizzes;
