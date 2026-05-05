import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import AIQuizList from '../components/AIQuizList'
import QuizTaking from '../components/QuizTaking'

import { API_BASE as API } from '../api/api'

function ParticipantDashboard({ user, onLogout, activeTab, onTabChange }) {
  const [tab, setTab] = useState(activeTab || 'available')
  const handleTabChange = (newTab) => {
    setTab(newTab)
    if (onTabChange) onTabChange(newTab)
  }
  const [trainings, setTrainings] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedbackModal, setFeedbackModal] = useState(null)
  const [fbForm, setFbForm] = useState({ trainerRating: 0, subjectRating: 0, comments: '', anonymous: false })
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [cancelConfirmModal, setCancelConfirmModal] = useState(null)

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  const notify = (m, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m)
    setTimeout(() => { setErr(''); setMsg('') }, 4000)
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = () => { fetchTrainings(); fetchEnrollments(); fetchFeedbacks() }

  const fetchTrainings = async () => {
    try {
      const r = await fetch(`${API}/trainings`, { headers: auth() })
      const d = await r.json()
      setTrainings(Array.isArray(d) ? d : (d.trainings || []))
    } catch { }
  }

  const fetchEnrollments = async () => {
    try {
      const r = await fetch(`${API}/participant/enrollments`, { headers: auth() })
      const d = await r.json()
      setEnrollments(d.enrollments || [])
    } catch { }
  }

  const fetchFeedbacks = async () => {
    try {
      const r = await fetch(`${API}/participant/feedbacks`, { headers: auth() })
      const d = await r.json()
      setFeedbacks(d.feedbacks || [])
    } catch { }
  }

  const handleEnroll = async (trainingId) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/participant/enroll`, { method: 'POST', headers: auth(), body: JSON.stringify({ trainingId }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      notify('Enrolled successfully')
      fetchAll()
    } catch (e) { notify(e.message, true) }
    finally { setLoading(false) }
  }

  const handleCancelEnrollment = async (trainingId) => {
    setCancelConfirmModal(trainingId)
  }

  const confirmCancelEnrollment = async (trainingId) => {
    setCancelConfirmModal(null)
    setLoading(true)
    try {
      const r = await fetch(`${API}/participant/enroll/${trainingId}`, { method: 'DELETE', headers: auth() })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      notify('Enrollment cancelled')
      fetchAll()
    } catch (e) { notify(e.message, true) }
    finally { setLoading(false) }
  }

  const openFeedback = async (enrollment) => {
    setFeedbackModal(enrollment)
    setFbForm({ trainerRating: 0, subjectRating: 0, comments: '', anonymous: false })
    setAnswers({})
    try {
      const r = await fetch(`${API}/survey/${enrollment.trainingId}`, { headers: auth() })
      const d = await r.json()
      setQuestions(d.questions || [])
    } catch { }
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    if (!fbForm.trainerRating || !fbForm.subjectRating) { notify('Please rate both trainer and subject', true); return }
    setLoading(true)
    try {
      const surveyAnswers = Object.entries(answers).map(([qid, val]) => {
        const q = questions.find(x => x.id === parseInt(qid))
        return {
          questionId: parseInt(qid),
          answerText: q.questionType !== 'RATING' ? val : null,
          answerRating: q.questionType === 'RATING' ? parseInt(val) : null
        }
      })

      const payload = { trainingId: feedbackModal.trainingId, ...fbForm, surveyAnswers }

      const r = await fetch(`${API}/feedback`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify(payload)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Server error')
      notify(d.message || 'Feedback submitted successfully')
      setFeedbackModal(null)
      fetchFeedbacks()
    } catch (e) { notify(e.message, true) }
    finally { setLoading(false) }
  }

  const isEnrolled = (id) => enrollments.some(e => e.trainingId === id)
  const hasFeedback = (id) => feedbacks.some(f => f.trainingId === id)
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'

  const StarPicker = ({ value, onChange }) => (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          className={`star interactive ${s <= value ? 'filled' : ''}`}
          style={{ fontSize: 28 }}
          onClick={() => onChange(s)}
        >&#9733;</span>
      ))}
    </div>
  )

  const Stars = ({ v }) => <span className="stars">{[1, 2, 3, 4, 5].map(s => <span key={s} className={`star ${s <= v ? 'filled' : ''}`}>&#9733;</span>)}</span>

  const TABS = [
    { key: 'available', label: 'Available Trainings' },
    { key: 'myEnrollments', label: 'My Enrollments' },
    { key: 'ai-quizzes', label: 'AI Quizzes' },
    { key: 'feedback', label: 'Give Feedback' },
    { key: 'myFeedbacks', label: 'My Feedbacks' },
  ]

  // Quiz state: store the full quiz object (with questions) + attempt id
  const [activeQuiz, setActiveQuiz] = useState(null)   // full quiz object
  const [quizAttemptId, setQuizAttemptId] = useState(null)

  /**
   * Called by AIQuizList after it hits /participant/start/:quizId.
   * Receives the attemptId AND the full quiz object (with questions array).
   */
  const handleStartQuiz = (attemptId, quiz) => {
    console.log('[ParticipantDashboard] Starting quiz:', quiz?.title, '| questions:', quiz?.questions?.length, '| attemptId:', attemptId)
    setActiveQuiz(quiz)
    setQuizAttemptId(attemptId)
  }

  const handleQuizComplete = (result) => {
    setActiveQuiz(null)
    setQuizAttemptId(null)
    if (result) notify(`Quiz submitted! Score: ${result.percentage?.toFixed(1) ?? 0}%`)
  }

  return (
    <div className="dashboard">
      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => handleTabChange(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'available' && (
        <div>
          {trainings.length === 0 ? (
            <div className="card"><div className="empty-state"><p>No trainings available right now.</p></div></div>
          ) : (
            <div className="training-grid">
              {trainings.map(t => {
                const enrolled = isEnrolled(t.id)
                const full = t.isFull
                const pct = t.capacity ? Math.round(((t.enrolledCount || 0) / t.capacity) * 100) : null
                return (
                  <div key={t.id} className="training-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div className="training-card-title" style={{ flex: 1, paddingRight: 10 }}>{t.title}</div>
                      {enrolled && <span className="badge badge-green">Enrolled</span>}
                      {full && !enrolled && <span className="badge badge-red">Full</span>}
                    </div>
                    <div className="training-card-desc">{t.description || 'No description available.'}</div>
                    <div className="training-meta">
                      <div className="meta-item"><span className="meta-key">Instructor:</span><span>{t.trainerName || 'TBA'}</span></div>
                      <div className="meta-item"><span className="meta-key">Dates:</span><span>{fmtDate(t.startDate)} - {fmtDate(t.endDate)}</span></div>
                      <div className="meta-item"><span className="meta-key">Enrolled:</span><span>{t.enrolledCount ?? 0} {t.capacity ? `/ ${t.capacity}` : ''}</span></div>
                    </div>
                    {pct !== null && (
                      <div style={{ marginBottom: 14 }}>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%`, background: pct > 80 ? 'var(--danger)' : undefined }} /></div>
                      </div>
                    )}
                    {!enrolled && !full && (
                      <button className="btn btn-primary btn-full" onClick={() => handleEnroll(t.id)} disabled={loading}>
                        Enroll in Program
                      </button>
                    )}
                    {enrolled && (
                      <button className="btn btn-full" style={{ color: 'var(--text-secondary)' }} disabled>Already Enrolled</button>
                    )}
                    {full && !enrolled && (
                      <button className="btn btn-full" disabled style={{ opacity: 0.5 }}>Training is Full</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'myEnrollments' && (
        <div className="card">
          <div className="card-header">
            <h3>My Enrollments ({enrollments.length})</h3>
          </div>
          {enrollments.length === 0 ? (
            <div className="empty-state"><p>Not enrolled in any training yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Training</th><th>Trainer</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.trainingTitle}</strong></td>
                      <td>{e.trainerName || '-'}</td>
                      <td>{fmtDate(e.startDate)}</td>
                      <td>{fmtDate(e.endDate)}</td>
                      <td><span className="badge badge-green">Enrolled</span></td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => handleCancelEnrollment(e.trainingId)}>Cancel</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="card">
          <div className="card-header">
            <h3>Submit Feedback</h3>
          </div>
          {enrollments.length === 0 ? (
            <div className="empty-state"><p>Enroll in a training first.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Training</th><th>Trainer</th><th>Start Date</th><th>Action</th></tr></thead>
                <tbody>
                  {enrollments.map(e => {
                    const started = new Date() >= new Date(e.startDate)
                    const submitted = hasFeedback(e.trainingId)
                    return (
                      <tr key={e.id}>
                        <td><strong>{e.trainingTitle}</strong></td>
                        <td>{e.trainerName || '-'}</td>
                        <td>{fmtDate(e.startDate)}</td>
                        <td>
                          {submitted
                            ? <span className="badge badge-green">Submitted</span>
                            : started
                              ? <button className="btn btn-sm btn-primary" onClick={() => openFeedback(e)}>Give Feedback</button>
                              : <span className="badge badge-gray">Not started</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'ai-quizzes' && (
        <div>
          {activeQuiz && quizAttemptId ? (
            // QuizTaking needs: quizId, attemptId, quizData (with questions), onSubmit
            <QuizTaking
              quizId={activeQuiz.id}
              attemptId={quizAttemptId}
              quizData={activeQuiz}
              onSubmit={handleQuizComplete}
            />
          ) : (
            // AIQuizList calls onStartQuiz(attemptId, quizObject) after making the start API call
            <AIQuizList
              user={user}
              onStartQuiz={handleStartQuiz}
            />
          )}
        </div>
      )}

      {tab === 'myFeedbacks' && (
        <div className="card">
          <div className="card-header">
            <h3>My Feedbacks ({feedbacks.length})</h3>
          </div>
          {feedbacks.length === 0 ? (
            <div className="empty-state"><p>No feedback submitted yet.</p></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Training</th><th>Trainer Rating</th><th>Subject Rating</th><th>Comments</th><th>Date</th></tr></thead>
                <tbody>
                  {feedbacks.map(f => (
                    <tr key={f.id}>
                      <td><strong>{f.trainingTitle}</strong></td>
                      <td><Stars v={f.trainerRating} /></td>
                      <td><Stars v={f.subjectRating} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>{f.comments || '-'}</td>
                      <td>{fmtDate(f.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {feedbackModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Feedback for "{feedbackModal.trainingTitle}"</h3>
              <button className="modal-close" onClick={() => setFeedbackModal(null)}>&#10005;</button>
            </div>
            <form onSubmit={handleSubmitFeedback}>
              <div className="form-group">
                <label className="form-label">Trainer Rating</label>
                <StarPicker value={fbForm.trainerRating} onChange={v => setFbForm(p => ({ ...p, trainerRating: v }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Rating</label>
                <StarPicker value={fbForm.subjectRating} onChange={v => setFbForm(p => ({ ...p, subjectRating: v }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Comments (optional)</label>
                <textarea className="form-control" value={fbForm.comments} onChange={e => setFbForm(p => ({ ...p, comments: e.target.value }))} placeholder="Share your experience..." />
              </div>
              <div className="toggle-row">
                <input type="checkbox" id="anon-toggle" checked={fbForm.anonymous} onChange={e => setFbForm(p => ({ ...p, anonymous: e.target.checked }))} />
                <label htmlFor="anon-toggle">Submit anonymously</label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setFeedbackModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Feedback'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelConfirmModal && (
        <div className="modal-backdrop" onClick={() => setCancelConfirmModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Enrollment?</h3>
              <button type="button" className="modal-close" onClick={() => setCancelConfirmModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel this enrollment? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setCancelConfirmModal(null)}>Keep Enrolled</button>
              <button type="button" className="btn btn-danger" onClick={() => confirmCancelEnrollment(cancelConfirmModal)} disabled={loading}>
                {loading ? 'Cancelling...' : 'Cancel Enrollment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ParticipantDashboard