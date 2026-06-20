import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QuizTaking from '../components/QuizTaking'
import { API_BASE } from '../api/api'
import { useToast } from '../components/Toast'
import { Loader2, AlertCircle } from 'lucide-react'

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
})

export default function ParticipantQuizAttemptPage({ user }) {
  const navigate = useNavigate()
  const { trainingId, quizId } = useParams()
  const [searchParams] = useSearchParams()
  const attemptId = searchParams.get('attemptId')
  const sessionToken = searchParams.get('sessionToken')
  const { error: showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [quizData, setQuizData] = useState(null)

  useEffect(() => {
    console.log(`[ParticipantQuizAttemptPage] Mounted with quizId: ${quizId}, attemptId: ${attemptId}, sessionToken: ${sessionToken}`)
    console.log(`[ParticipantQuizAttemptPage] Logged-in user role:`, user?.role)
    console.log(`[ParticipantQuizAttemptPage] Logged-in user email:`, user?.email)
    console.log(`[ParticipantQuizAttemptPage] JWT token payload status:`, user?.token ? 'Present' : 'Absent')

    if (!quizId || !attemptId) {
      console.warn('[ParticipantQuizAttemptPage] Missing quizId or attemptId. Navigation aborted.')
      setErrorMsg('Invalid quiz or attempt identifiers.')
      setLoading(false)
      return
    }

    let aborted = false
    const fetchQuestions = async () => {
      try {
        setLoading(true)
        const requestUrl = `${API_BASE}/quizzes/${quizId}/questions`
        console.log(`[ParticipantQuizAttemptPage] Fetching questions from: ${requestUrl}`)

        const res = await fetch(requestUrl, {
          headers: authHeaders(user.token)
        })

        console.log(`[ParticipantQuizAttemptPage] Fetch questions response status: ${res.status}`)
        const data = await res.json()
        console.log(`[ParticipantQuizAttemptPage] Fetch questions response data:`, data)

        if (aborted) {
          console.log('[ParticipantQuizAttemptPage] Component unmounted before response processed. Aborting.')
          return
        }

        if (!res.ok) {
          console.error(`[ParticipantQuizAttemptPage] Error received:`, data.error)
          setErrorMsg(data.error || 'Failed to load quiz questions.')
          setLoading(false)
          return
        }

        // Build the structure that QuizTaking expects
        setQuizData({
          id: data.quiz.id,
          title: data.quiz.title,
          timeLimit: data.quiz.timeLimit,
          questions: data.questions || []
        })
        setLoading(false)
      } catch (err) {
        console.error(`[ParticipantQuizAttemptPage] Fetch catch error:`, err)
        if (!aborted) {
          setErrorMsg(err.message || 'Server error loading quiz.')
          setLoading(false)
        }
      }
    }

    fetchQuestions()
    return () => {
      aborted = true
    }
  }, [quizId, attemptId, user.token, sessionToken])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: "'Manrope', 'Poppins', sans-serif"
      }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} size={36} />
        <span style={{ marginTop: '12px', fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
          Initializing Quiz Session...
        </span>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 20,
        fontFamily: "'Manrope', 'Poppins', sans-serif"
      }}>
        <AlertCircle size={48} color="#dc2626" style={{ marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
          Unable to Start Quiz
        </h3>
        <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 400, margin: '0 0 20px', lineHeight: 1.5 }}>
          {errorMsg}
        </p>
        <button
          onClick={() => navigate('/participant')}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  return (
    <QuizTaking
      quizId={parseInt(quizId, 10)}
      attemptId={parseInt(attemptId, 10)}
      quizData={quizData}
      sessionToken={sessionToken}
      isStandardQuiz={true}
      onSubmit={() => {
        navigate(`/trainings/${trainingId}/quizzes/${quizId}/result`)
      }}
    />
  )
}
