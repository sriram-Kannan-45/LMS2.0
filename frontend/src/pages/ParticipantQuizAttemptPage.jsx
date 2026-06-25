import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import QuizTaking from '../components/QuizTaking'
import AssessmentConsentGate from '../components/ai-quizzes/AssessmentConsentGate'
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
  const { error: showError } = useToast()

  let attemptId = searchParams.get('attemptId')
  let sessionToken = searchParams.get('sessionToken')

  if (quizId) {
    const storageKey = `quiz_${quizId}_attempt`
    if (attemptId && sessionToken) {
      sessionStorage.setItem(storageKey, JSON.stringify({ attemptId, sessionToken }))
    } else {
      const cached = sessionStorage.getItem(storageKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          attemptId = attemptId || parsed.attemptId
          sessionToken = sessionToken || parsed.sessionToken
        } catch (e) {
          console.error('[ParticipantQuizAttemptPage] Error parsing cached session:', e)
        }
      }
    }
  }

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [quizData, setQuizData] = useState(null)
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    if (!quizId || !attemptId) {
      setErrorMsg('Invalid quiz or attempt identifiers.')
      setLoading(false)
      return
    }

    let aborted = false
    const fetchQuestions = async () => {
      try {
        setLoading(true)
        const requestUrl = `${API_BASE}/quizzes/${quizId}/questions`

        const res = await fetch(requestUrl, {
          headers: authHeaders(user.token)
        })

        const data = await res.json()

        if (aborted) return

        if (!res.ok) {
          setErrorMsg(data.error || 'Failed to load quiz questions.')
          setLoading(false)
          return
        }

        setQuizData({
          id: data.quiz.id,
          title: data.quiz.title,
          timeLimit: data.quiz.timeLimit,
          copyProtectionEnabled: data.quiz.copyProtectionEnabled,
          maxCopyWarnings: data.quiz.maxCopyWarnings,
          copyViolationActions: data.quiz.copyViolationActions,
          copyWarningMessage: data.quiz.copyWarningMessage,
          copyDisqualifyAction: data.quiz.copyDisqualifyAction,
          proctoringEnabled: data.quiz.proctoringEnabled,
          proctoringLevel: data.quiz.proctoringLevel,
          gracePeriodMinutes: data.quiz.gracePeriodMinutes,
          initialViolationCount: data.attempt?.violationCount || 0,
          initialStatus: data.attempt?.status || 'IN_PROGRESS',
          questions: data.questions || []
        })
        setLoading(false)
      } catch (err) {
        if (!aborted) {
          setErrorMsg(err.message || 'Server error loading quiz.')
          setLoading(false)
        }
      }
    }

    fetchQuestions()
    return () => { aborted = true }
  }, [quizId, attemptId, user.token])

  useEffect(() => {
    if (quizData && quizData.proctoringEnabled) {
      navigate(`/participant/exam/${quizId}`, {
        state: {
          attemptId: attemptId,
          quizData: quizData
        },
        replace: true
      })
    }
  }, [quizData, quizId, attemptId, navigate])

  const handleConsented = useCallback(() => {
    setConsented(true)
  }, [])

  const handleCancel = useCallback(() => {
    navigate(`/trainings/${trainingId}`)
  }, [navigate, trainingId])

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

  // Show consent gate before starting the quiz
  if (!consented && quizData) {
    return (
      <AssessmentConsentGate
        quiz={quizData}
        attemptId={parseInt(attemptId, 10)}
        onConsented={handleConsented}
        onCancel={handleCancel}
      />
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
