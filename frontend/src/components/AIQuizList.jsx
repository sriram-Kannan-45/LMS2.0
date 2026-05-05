import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { API_BASE } from '../api/api'
import { getAuthHeaders } from '../api/request'

function AIQuizList({ user, onStartQuiz }) {
  const [quizzes, setQuizzes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null); // track which quiz is being started

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/ai-quiz/participant/quizzes`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      const list = data.quizzes || [];
      setQuizzes(list);
      console.log(`[AIQuizList] Loaded ${list.length} quizzes`);
      list.forEach(q => {
        console.log(`  → Quiz #${q.id} "${q.title}" — ${q.questions?.length ?? 0} questions`);
      });
    } catch (err) {
      console.error('[AIQuizList] Failed to load quizzes:', err);
      setError('Failed to load quizzes');
    } finally {
      setFetching(false);
    }
  };

  /**
   * Call the start API to create an attempt and get back the full quiz with questions.
   * Then pass { attemptId, quiz } back to the parent so QuizTaking has all it needs.
   */
  const handleStart = async (quiz) => {
    if (startingId) return; // prevent double-click
    setStartingId(quiz.id);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/ai-quiz/participant/start/${quiz.id}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to start quiz');

      // data.quiz is the full quiz with questions from the backend
      const quizWithQuestions = data.quiz;
      if (!quizWithQuestions || !quizWithQuestions.questions || quizWithQuestions.questions.length === 0) {
        throw new Error('This quiz has no questions yet. Please contact your trainer.');
      }

      console.log(`[AIQuizList] Starting quiz "${quizWithQuestions.title}" — ${quizWithQuestions.questions.length} questions, attemptId=${data.attemptId}`);

      if (onStartQuiz) onStartQuiz(data.attemptId, quizWithQuestions);
    } catch (err) {
      console.error('[AIQuizList] Start error:', err.message);
      setError(err.message);
    } finally {
      setStartingId(null);
    }
  };

  if (fetching) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <p>Loading quizzes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>
        <button className="btn btn-sm btn-primary" onClick={fetchQuizzes}>Retry</button>
      </div>
    );
  }

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <h3>No Quizzes Available</h3>
        <p>Quizzes will appear here when your trainers publish them.</p>
      </div>
    );
  }

  return (
    <div className="training-list">
      {quizzes.map((quiz, i) => (
        <motion.div
          key={quiz.id}
          className="training-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <div className="training-card-title">{quiz.title}</div>
          <div className="training-meta">
            <span className="meta-key">❓ Questions:</span>
            <span><strong>{quiz.questions?.length ?? 0}</strong></span>
          </div>
          <div className="training-meta">
            <span className="meta-key">⏱ Time:</span>
            <span>{quiz.timeLimit || 30} min</span>
          </div>
          <div className="training-meta">
            <span className="meta-key">🎯 Difficulty:</span>
            <span className={`badge ${
              quiz.difficulty === 'EASY' ? 'badge-green' :
              quiz.difficulty === 'HARD' ? 'badge-red' : 'badge-yellow'
            }`}>
              {quiz.difficulty}
            </span>
          </div>
          {quiz.training && (
            <div className="training-meta">
              <span className="meta-key">📚 Training:</span>
              <span>{quiz.training.title}</span>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-sm btn-primary"
              disabled={startingId === quiz.id}
              onClick={() => handleStart(quiz)}
            >
              {startingId === quiz.id ? 'Starting...' : 'Start Quiz'}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default AIQuizList;
