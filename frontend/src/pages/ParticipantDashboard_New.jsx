import { useState, useEffect } from 'react'

import { API_BASE as API } from '../api/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-'

function ParticipantDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('trainings')
  const [trainings, setTrainings] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [surveyQuestions, setSurveyQuestions] = useState([])
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Feedback form
  const [feedbackForm, setFeedbackForm] = useState({
    trainingId: null,
    trainerRating: 3,
    subjectRating: 3,
    comments: '',
    anonymous: false
  })

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  const notify = (m, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m)
    setTimeout(() => { setErr(''); setMsg('') }, 4000)
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    await Promise.all([
      fetchTrainings(),
      fetchEnrollments(),
      fetchMyFeedbacks()
    ])
  }

  const fetchTrainings = async () => {
    try {
      const r = await fetch(`${API}/trainings`, { headers: auth() })
      const d = await r.json()
      setTrainings(Array.isArray(d) ? d : (d.trainings || []))
    } catch (e) { console.error(e) }
  }

  const fetchEnrollments = async () => {
    try {
      const r = await fetch(`${API}/participant/enrollments`, { headers: auth() })
      const d = await r.json()
      setEnrollments(d.enrollments || [])
    } catch (e) { console.error(e) }
  }

  const fetchSurveyQuestions = async (trainingId) => {
    try {
      const r = await fetch(`${API}/survey/${trainingId}`, { headers: auth() })
      const d = await r.json()
      setSurveyQuestions(d.questions || [])
    } catch (e) { console.error(e) }
  }

  const fetchMyFeedbacks = async () => {
    try {
      const r = await fetch(`${API}/feedback/my-feedbacks`, { headers: auth() })
      const d = await r.json()
      setFeedbacks(d.feedbacks || [])
    } catch (e) { console.error(e) }
  }

  const handleEnroll = async (trainingId) => {
    if (!window.confirm('Enroll in this training?')) return
    
    setLoading(true)
    try {
      const r = await fetch(`${API}/participant/enroll`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ trainingId })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      await fetchEnrollments()
      notify('✅ Enrolled successfully')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    
    if (!feedbackForm.trainingId) {
      notify('Select a training', true)
      return
    }
    
    setLoading(true)
    try {
      const r = await fetch(`${API}/feedback`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify(feedbackForm)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      setFeedbackForm({ trainingId: null, trainerRating: 3, subjectRating: 3, comments: '', anonymous: false })
      setSelectedTraining(null)
      await fetchMyFeedbacks()
      notify('✅ Feedback submitted')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTraining = async (trainingId) => {
    setSelectedTraining(trainingId)
    setFeedbackForm({ ...feedbackForm, trainingId })
    await fetchSurveyQuestions(trainingId)
  }

  // Check if already submitted feedback for training
  const hasSubmittedFeedback = (trainingId) => {
    return feedbacks.some(f => f.trainingId === trainingId)
  }

  // Check if enrolled in training
  const isEnrolled = (trainingId) => {
    return enrollments.some(e => e.trainingId === trainingId)
  }

  const TabButton = ({ key, label, active }) => (
    <button
      onClick={() => setTab(key)}
      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  )

  const StatCard = ({ icon, label, value }) => (
    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl shadow-lg border-l-4 border-indigo-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-semibold">{label}</p>
          <p className="text-2xl font-bold text-indigo-700 mt-2">{value}</p>
        </div>
        <div className="text-4xl opacity-30">{icon}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🎓 Participant Dashboard</h1>
            <p className="text-indigo-100 text-sm mt-1">Welcome, {user.name}</p>
          </div>
          <button
            onClick={onLogout}
            className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Alerts */}
      {msg && <div className="bg-green-500 text-white px-6 py-3 text-center font-semibold animate-pulse">{msg}</div>}
      {err && <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold animate-pulse">❌ {err}</div>}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard icon="📚" label="My Enrollments" value={enrollments.length} />
          <StatCard icon="⭐" label="Feedbacks Submitted" value={feedbacks.length} />
          <StatCard icon="📖" label="Available Trainings" value={trainings.length} />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8 pb-6 border-b border-gray-700">
          <TabButton key="trainings" label="📚 Available Trainings" active={tab === 'trainings'} />
          <TabButton key="enrolled" label="✅ My Enrollments" active={tab === 'enrolled'} />
          <TabButton key="feedback" label="⭐ Submit Feedback" active={tab === 'feedback'} />
          <TabButton key="myfeedbacks" label="📝 My Feedbacks" active={tab === 'myfeedbacks'} />
        </div>

        {/* TRAININGS TAB */}
        {tab === 'trainings' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.length === 0 ? (
              <p className="text-gray-400 text-center col-span-full py-8">No trainings available</p>
            ) : (
              trainings.map(t => (
                <div key={t.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition shadow-lg">
                  <h4 className="font-bold text-xl mb-2">{t.title}</h4>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{t.description}</p>
                  <div className="text-sm text-gray-400 space-y-1 mb-4">
                    <p>📅 {fmtDate(t.startDate)}</p>
                    <p>👨‍🏫 {t.trainerName || 'TBA'}</p>
                  </div>
                  <button
                    onClick={() => handleEnroll(t.id)}
                    disabled={isEnrolled(t.id) || loading}
                    className={`w-full py-2 rounded-lg font-semibold transition ${
                      isEnrolled(t.id)
                        ? 'bg-green-600 text-white cursor-default'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
                    }`}
                  >
                    {isEnrolled(t.id) ? '✅ Enrolled' : '📝 Enroll Now'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ENROLLED TAB */}
        {tab === 'enrolled' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            {enrollments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Not enrolled in any training yet</p>
            ) : (
              <div className="space-y-4">
                {enrollments.map(e => {
                  const training = trainings.find(t => t.id === e.trainingId)
                  return training ? (
                    <div key={e.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600 flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{training.title}</h4>
                        <p className="text-gray-300 text-sm mt-1">{training.description}</p>
                        <p className="text-gray-400 text-sm mt-2">📅 {fmtDate(training.startDate)}</p>
                      </div>
                      <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">Enrolled</span>
                    </div>
                  ) : null
                })}
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {tab === 'feedback' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">⭐ Submit Feedback</h2>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Select Training</label>
                <select
                  value={feedbackForm.trainingId || ''}
                  onChange={(e) => handleSelectTraining(parseInt(e.target.value))}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-400 outline-none transition"
                  required
                >
                  <option value="">Choose a training...</option>
                  {enrollments.map(e => {
                    const t = trainings.find(tr => tr.id === e.trainingId)
                    return t ? (
                      <option key={e.id} value={t.id}>
                        {t.title} {hasSubmittedFeedback(t.id) ? '(Already submitted)' : ''}
                      </option>
                    ) : null
                  })}
                </select>
              </div>

              {selectedTraining && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Trainer Rating ⭐ ({feedbackForm.trainerRating}/5)</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={feedbackForm.trainerRating}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, trainerRating: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Subject Rating ⭐ ({feedbackForm.subjectRating}/5)</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={feedbackForm.subjectRating}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, subjectRating: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {surveyQuestions.length > 0 && (
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Survey Questions</h4>
                      {surveyQuestions.map(q => (
                        <div key={q.id} className="mb-3">
                          <p className="text-sm font-semibold">{q.questionText}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-2">Comments</label>
                    <textarea
                      value={feedbackForm.comments}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, comments: e.target.value })}
                      placeholder="Share your feedback..."
                      rows="4"
                      className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-400 outline-none transition"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feedbackForm.anonymous}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, anonymous: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-semibold">Submit anonymously</span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {loading ? '⏳ Submitting...' : '✅ Submit Feedback'}
                  </button>
                </>
              )}
            </form>
          </div>
        )}

        {/* MY FEEDBACKS TAB */}
        {tab === 'myfeedbacks' && (
          <div className="space-y-4">
            {feedbacks.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No feedbacks submitted yet</p>
            ) : (
              feedbacks.map(f => (
                <div key={f.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{f.trainingTitle}</h4>
                      <p className="text-gray-400 text-sm">Submitted: {fmtDate(f.submittedAt)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Trainer Rating</p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span key={i} className={i <= f.trainerRating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Subject Rating</p>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span key={i} className={i <= f.subjectRating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {f.comments && (
                    <p className="text-gray-300 text-sm border-l-4 border-purple-500 pl-4">
                      "{f.comments}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ParticipantDashboard
