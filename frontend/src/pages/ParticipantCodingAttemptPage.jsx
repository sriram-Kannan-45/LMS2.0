import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AssessmentConsentGate from '../components/ai-quizzes/AssessmentConsentGate'
import { API_BASE } from '../api/api'
import { useToast } from '../components/Toast'
import { Loader2, AlertCircle, Play, Check, X, Clock, Send, Maximize2, Minimize2, Save, Monitor, MonitorOff, Terminal, Bug, Trash2 } from 'lucide-react'
import { ProctorProvider, useProctor } from '../proctoring/ProctorContext'
import useDeviceFingerprint from '../proctoring/hooks/useDeviceFingerprint'
import useScreenRecorder from '../hooks/useScreenRecorder'
import RecordingIndicator from '../components/shared/RecordingIndicator'
import CodeEditor from '../components/CodeEditor'
import ProblemPanel from '../components/ProblemPanel'

const STORAGE_PREFIX = 'coding_attempt_'
const AUTO_SAVE_INTERVAL = 10000
const SERVER_SAVE_INTERVAL = 30000

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
})

function getStorageKey(attemptId) {
  return `${STORAGE_PREFIX}${attemptId}`
}

const LANGUAGE_MAP = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  typescript: 'typescript',
  go: 'go',
  rust: 'rust',
  php: 'php',
  kotlin: 'kotlin',
}

function ParticipantCodingAttemptInner({ user }) {
  const navigate = useNavigate()
  const { trainingId, assessmentId } = useParams()
  const [searchParams] = useSearchParams()
  const { error: showError } = useToast()
  const proctor = useProctor()
  const fp = useDeviceFingerprint()

  let attemptId = searchParams.get('attemptId')
  let sessionToken = searchParams.get('sessionToken')
  const sessionIdParam = searchParams.get('sessionId') || `session_${Date.now()}`

  const storageKey = getStorageKey(attemptId)

  if (assessmentId) {
    if (attemptId && sessionToken) {
      sessionStorage.setItem(storageKey, JSON.stringify({ attemptId, sessionToken }))
    } else {
      const cached = sessionStorage.getItem(storageKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          attemptId = attemptId || parsed.attemptId
          sessionToken = sessionToken || parsed.sessionToken
        } catch {}
      }
    }
  }

  const {
    recording: screenRecording,
    startRecording,
    stopRecording,
    uploadRecording,
    error: recorderError
  } = useScreenRecorder({
    assessmentType: 'coding',
    assessmentId,
    participantId: user?.id,
    sessionId: sessionIdParam,
    userToken: user?.token
  })

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [problems, setProblems] = useState([])
  const [consented, setConsented] = useState(false)
  const [screenStream, setScreenStream] = useState(null)
  const [sessionError, setSessionError] = useState(null)

  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [codeByProblem, setCodeByProblem] = useState({})
  const [languageByProblem, setLanguageByProblem] = useState({})
  const [output, setOutput] = useState('')
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')
  const [compileOutput, setCompileOutput] = useState('')
  const [executionTime, setExecutionTime] = useState(null)
  const [memoryUsed, setMemoryUsed] = useState(null)
  const [exitCode, setExitCode] = useState(null)
  const [executionStatus, setExecutionStatus] = useState('')
  const [testResults, setTestResults] = useState([])
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [screenShareActive, setScreenShareActive] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [activeTab, setActiveTab] = useState('output')
  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)
  const serverSaveRef = useRef(null)
  const codeByProblemRef = useRef(codeByProblem)
  const outputRef = useRef(null)

  useEffect(() => { codeByProblemRef.current = codeByProblem }, [codeByProblem])

  const startTimeRef = useRef(null)

  useEffect(() => {
    if (!assessmentId || !attemptId) {
      setErrorMsg('Invalid assessment or attempt identifiers.')
      setLoading(false)
      return
    }

    let aborted = false
    const fetchAssessment = async () => {
      try {
        setLoading(true)

        const res = await fetch(`${API_BASE}/coding/assessments/${assessmentId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })
        const data = await res.json()
        if (aborted) return
        if (!res.ok) {
          setErrorMsg(data.error || 'Failed to load assessment.')
          setLoading(false)
          return
        }

        const a = data.assessment
        setAssessment(a)
        setProblems(a.problems || [])

        const savedState = loadSavedState(attemptId)
        const savedCodes = {}
        const savedLanguages = {}
        const now = Date.now()

        ;(a.problems || []).forEach(p => {
          const existing = savedState?.codes?.[p.id]
          savedCodes[p.id] = existing || p.starterCode || ''
          savedLanguages[p.id] = savedState?.languages?.[p.id] || p.programmingLanguage || p.language || 'javascript'
        })

        setCodeByProblem(savedCodes)
        setLanguageByProblem(savedLanguages)

        if (savedState?.startedAt) {
          startTimeRef.current = savedState.startedAt
          const elapsed = Math.floor((now - savedState.startedAt) / 1000)
          const total = (a.timeLimit || 60) * 60
          setTimeLeft(Math.max(0, total - elapsed))
        } else {
          startTimeRef.current = now
          setTimeLeft((a.timeLimit || 60) * 60)
        }

        setCurrentProblemIndex(savedState?.currentProblem ?? 0)
        setLoading(false)
        setRestoring(false)
      } catch (err) {
        if (!aborted) {
          setErrorMsg(err.message || 'Server error loading assessment.')
          setLoading(false)
        }
      }
    }

    fetchAssessment()
    return () => { aborted = true }
  }, [assessmentId, attemptId, user.token])

  function loadSavedState(attId) {
    try {
      const raw = localStorage.getItem(getStorageKey(attId))
      if (!raw) return null
      return JSON.parse(raw)
    } catch { return null }
  }

  function persistState() {
    if (!attemptId) return
    try {
      const state = {
        codes: codeByProblemRef.current,
        languages: languageByProblem,
        currentProblem: currentProblemIndex,
        startedAt: startTimeRef.current || Date.now(),
        updatedAt: Date.now()
      }
      localStorage.setItem(getStorageKey(attemptId), JSON.stringify(state))
    } catch {}
  }

  const autoSaveCallback = useCallback(() => {
    persistState()
    setSaveStatus('Saved')
    setTimeout(() => setSaveStatus(prev => prev === 'Saved' ? '' : prev), 2000)
  }, [attemptId, currentProblemIndex, languageByProblem])

  useEffect(() => {
    if (!attemptId || submitted) return
    autoSaveRef.current = setInterval(autoSaveCallback, AUTO_SAVE_INTERVAL)
    return () => clearInterval(autoSaveRef.current)
  }, [attemptId, submitted, autoSaveCallback])

  const saveToServer = useCallback(async () => {
    if (!attemptId || !user?.token) return
    const entries = Object.entries(codeByProblemRef.current)
    for (const [problemId, code] of entries) {
      try {
        const headers = { ...authHeaders(user.token), 'Content-Type': 'application/json' }
        if (sessionToken) headers['X-Assessment-Session'] = sessionToken
        await fetch(`${API_BASE}/coding/participant/save`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            attemptId: Number(attemptId),
            problemId: Number(problemId),
            code,
            language: languageByProblem[Number(problemId)] || problems.find(p => p.id === Number(problemId))?.programmingLanguage || 'javascript',
          })
        })
      } catch {}
    }
  }, [attemptId, user?.token, sessionToken, problems, languageByProblem])

  useEffect(() => {
    if (!attemptId || submitted) return
    serverSaveRef.current = setInterval(saveToServer, SERVER_SAVE_INTERVAL)
    return () => clearInterval(serverSaveRef.current)
  }, [attemptId, submitted, saveToServer])

  useEffect(() => {
    if (timeLeft == null || submitted) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft, submitted])

  useEffect(() => {
    if (!screenStream) return
    const handleEnded = () => setScreenShareActive(false)
    const tracks = screenStream.getVideoTracks()
    tracks.forEach(t => t.addEventListener('ended', handleEnded))
    return () => tracks.forEach(t => t.removeEventListener('ended', handleEnded))
  }, [screenStream])

  useEffect(() => {
    if (timeLeft === 0 && !submitted) {
      handleSubmit()
    }
  }, [timeLeft])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [stdout, stderr, compileOutput, testResults])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const handleScreenShareReady = useCallback(async (stream) => {
    if (!stream) return
    setScreenStream(stream)
    setScreenShareActive(true)
    setSessionError(null)
    proctor.setScreenStream(stream)
    try {
      const s = await proctor.start({
        assessmentId: Number(assessmentId),
        attemptId: Number(attemptId),
        fingerprintHash: fp,
        screenSharing: true,
        assessmentType: 'coding',
      })
      await proctor.activate(s.sessionId, s.sessionToken)
      startRecording()
    } catch (err) {
      setSessionError(err?.message || 'Failed to start proctoring session.')
      stream.getTracks().forEach(t => t.stop())
      setScreenStream(null)
      setScreenShareActive(false)
      proctor.setScreenStream(null)
    }
  }, [assessmentId, attemptId, fp, proctor, startRecording])

  const handleConsented = useCallback(() => {
    setConsented(true)
  }, [])

  const handleCancel = useCallback(() => {
    if (screenStream) screenStream.getTracks().forEach(t => t.stop())
    navigate(`/trainings/${trainingId}`)
  }, [navigate, trainingId, screenStream])

  const currentProblem = problems[currentProblemIndex]

  const handleCodeChange = (value) => {
    if (!currentProblem) return
    setCodeByProblem(prev => ({ ...prev, [currentProblem.id]: value || '' }))
  }

  const handleLanguageChange = (lang) => {
    if (!currentProblem) return
    setLanguageByProblem(prev => ({ ...prev, [currentProblem.id]: lang }))
    persistState()
  }

  const handleRunCode = async () => {
    if (!currentProblem) return
    setRunning(true)
    setStdout('')
    setStderr('')
    setCompileOutput('')
    setExecutionTime(null)
    setMemoryUsed(null)
    setExitCode(null)
    setExecutionStatus('')
    setTestResults([])
    setActiveTab('output')

    await saveToServer()

    try {
      const headers = { ...authHeaders(user.token), 'Content-Type': 'application/json' }
      if (sessionToken) headers['X-Assessment-Session'] = sessionToken

      const res = await fetch(`${API_BASE}/coding/participant/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          attemptId: Number(attemptId),
          problemId: currentProblem.id,
          code: codeByProblem[currentProblem.id] || '',
          language: languageByProblem[currentProblem.id] || currentProblem.programmingLanguage || 'javascript',
          stdin: customInput || '',
          timeLimit: currentProblem.timeLimit || 5,
          memoryLimit: currentProblem.memoryLimit || 256,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code execution failed')

      const r = data.result
      setStdout(r.stdout || '')
      setStderr(r.stderr || '')
      setCompileOutput(r.compileOutput || '')
      setExecutionTime(r.executionTime || 0)
      setMemoryUsed(r.memoryUsed || 0)
      setExitCode(r.exitCode)
      setExecutionStatus(r.status || '')
    } catch (err) {
      if (err.message.includes('SESSION_INVALID') || err.message.includes('401')) {
        setStderr('Session expired. Please refresh the page to continue.')
      } else {
        setStderr(`Error: ${err.message}`)
      }
    } finally {
      setRunning(false)
    }
  }

  const handleResetCode = () => {
    if (!currentProblem) return
    const confirmed = window.confirm('Reset code to starter template? This cannot be undone.')
    if (!confirmed) return
    setCodeByProblem(prev => ({ ...prev, [currentProblem.id]: currentProblem.starterCode || '' }))
    setStdout('')
    setStderr('')
    setCompileOutput('')
    setExecutionTime(null)
    setMemoryUsed(null)
    setExitCode(null)
    setExecutionStatus('')
    setTestResults([])
  }

  const handleSubmit = async () => {
    if (!confirm('Submit your coding assessment? You cannot make further changes.')) return
    setSubmitting(true)
    try {
      await saveToServer()

      const submissions = problems.map(p => ({
        problemId: p.id,
        code: codeByProblem[p.id] || '',
        language: languageByProblem[p.id] || p.programmingLanguage || 'javascript',
      }))

      const headers = { ...authHeaders(user.token), 'Content-Type': 'application/json' }
      if (sessionToken) headers['X-Assessment-Session'] = sessionToken

      const res = await fetch(`${API_BASE}/coding/participant/submit/${attemptId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ submissions })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submit failed')
      setSubmitted(true)
      clearInterval(timerRef.current)
      if (screenStream) screenStream.getTracks().forEach(t => t.stop())
      await stopRecording()
      await uploadRecording()
      localStorage.removeItem(getStorageKey(attemptId))
      sessionStorage.removeItem(storageKey)
      navigate(`/trainings/${trainingId}/coding/${assessmentId}/result?attemptId=${attemptId}`)
    } catch (err) {
      showError?.(err.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {})
    }
  }

  const currentLanguage = languageByProblem[currentProblem?.id] || currentProblem?.programmingLanguage || 'javascript'

  if (loading || restoring) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8' }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20, textAlign: 'center' }}>
        <AlertCircle size={32} color="#dc2626" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>{errorMsg}</div>
        <button onClick={() => navigate(`/trainings/${trainingId}`)} style={{
          padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>Go Back</button>
      </div>
    )
  }

  if (!consented) {
    return (
      <AssessmentConsentGate
        title={assessment?.title || 'Coding Assessment'}
        description={assessment?.description || 'You are about to begin a proctored coding assessment.'}
        timeLimit={assessment?.timeLimit || 60}
        attemptId={attemptId}
        sessionToken={sessionToken}
        onConsented={handleConsented}
        onCancel={handleCancel}
        onScreenShareReady={handleScreenShareReady}
        hasScreenStream={!!screenStream}
        sessionError={sessionError}
        userId={user?.id}
        userToken={user?.token}
        assessmentType="coding"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', background: '#1e293b', borderBottom: '1px solid #334155', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{assessment?.title}</span>
          <RecordingIndicator recording={!!screenRecording} />
          {saveStatus && (
            <span style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Save size={10} /> {saveStatus}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Problem {currentProblemIndex + 1} of {problems.length}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            borderRadius: 6, background: timeLeft < 300 ? '#451a1a' : '#1e293b',
            color: timeLeft < 300 ? '#f87171' : '#94a3b8', fontWeight: 700, fontSize: 13,
          }}>
            <Clock size={14} />
            {formatTime(timeLeft)}
          </div>
          {!screenShareActive && (
            <button
              onClick={async () => {
                try {
                  const newStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' }, audio: false,
                  })
                  if (newStream) {
                    const track = newStream.getVideoTracks()[0];
                    if (track && track.readyState === 'live') {
                      setScreenStream(newStream);
                      setScreenShareActive(true);
                      proctor.setScreenStream(newStream);
                    } else {
                      setTimeout(() => {
                        setScreenStream(newStream);
                        setScreenShareActive(true);
                        proctor.setScreenStream(newStream);
                      }, 1000);
                    }
                  }
                } catch {}
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                background: '#451a1a', color: '#f87171', border: '1px solid #7f1d1d',
                borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              }}
              title="Screen sharing stopped - click to restart"
            >
              <MonitorOff size={12} /> Restart Share
            </button>
          )}
          {screenShareActive && (
            <div
              style={{
                width: 32, height: 32, border: '1px solid #166534', borderRadius: 6,
                background: '#052e16', color: '#4ade80', display: 'flex', alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Screen is being shared"
            >
              <Monitor size={14} />
            </div>
          )}
          <button onClick={toggleFullscreen} style={{
            width: 32, height: 32, border: '1px solid #334155', cursor: 'pointer', borderRadius: 6,
            background: '#1e293b', color: '#94a3b8', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitted}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', background: submitted ? '#334155' : '#059669',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: submitting || submitted ? 'default' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitted ? 'Submitted' : 'Submit'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: '35%', minWidth: 320, maxWidth: 500, overflow: 'auto', borderRight: '1px solid #334155',
          background: '#0f172a',
        }}>
          {problems.length > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '12px 16px', borderBottom: '1px solid #334155', background: '#1e293b' }}>
              {problems.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentProblemIndex(i)}
                  style={{
                    padding: '4px 12px', border: i === currentProblemIndex ? '1px solid #6366f1' : '1px solid #334155',
                    borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, fontWeight: i === currentProblemIndex ? 700 : 500,
                    background: i === currentProblemIndex ? '#312e81' : '#1e293b',
                    color: i === currentProblemIndex ? '#e0e7ff' : '#94a3b8',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          <div style={{ color: '#e2e8f0' }}>
            <ProblemPanel problem={currentProblem} />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden', borderBottom: '1px solid #334155' }}>
            <CodeEditor
              value={codeByProblem[currentProblem?.id] || ''}
              language={currentLanguage}
              onChange={handleCodeChange}
              onLanguageChange={handleLanguageChange}
              readOnly={running || submitted}
            />
          </div>

          {showCustomInput && (
            <div style={{
              borderBottom: '1px solid #334155', background: '#1e293b', flexShrink: 0,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', background: '#1e293b',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Custom Input
                </span>
              </div>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter your custom input here..."
                spellCheck={false}
                style={{
                  width: '100%', minHeight: 80, padding: 10, border: 'none',
                  background: '#0f172a', color: '#e2e8f0', fontFamily: "'Fira Code', monospace",
                  fontSize: 13, resize: 'vertical', outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ flex: '0 0 auto', maxHeight: '35%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 12px', background: '#1e293b', borderBottom: '1px solid #334155',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setActiveTab('output')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: activeTab === 'output' ? '#334155' : 'transparent',
                    color: activeTab === 'output' ? '#e2e8f0' : '#64748b',
                  }}
                >
                  <Terminal size={12} /> Output
                </button>
                {testResults.length > 0 && (
                  <button
                    onClick={() => setActiveTab('testResults')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer',
                      fontSize: 11, fontWeight: 600,
                      background: activeTab === 'testResults' ? '#334155' : 'transparent',
                      color: activeTab === 'testResults' ? '#e2e8f0' : '#64748b',
                    }}
                  >
                    <Bug size={12} /> Test Results
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setShowCustomInput(prev => !prev)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', background: 'transparent',
                    color: showCustomInput ? '#6366f1' : '#64748b',
                    border: `1px solid ${showCustomInput ? '#6366f1' : '#334155'}`,
                    borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  }}
                >
                  Input
                </button>
                <button
                  onClick={handleResetCode}
                  disabled={running}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', background: 'transparent',
                    color: '#64748b', border: '1px solid #334155',
                    borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  }}
                  title="Reset code to starter template"
                >
                  <Trash2 size={12} /> Reset
                </button>
                <button
                  onClick={handleRunCode}
                  disabled={running || submitted}
                  data-run-button="true"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', background: running ? '#334155' : '#2563eb',
                    color: '#fff', border: 'none', borderRadius: 6,
                    fontSize: 12, fontWeight: 600, cursor: (running || submitted) ? 'default' : 'pointer',
                    opacity: running ? 0.6 : 1,
                  }}
                >
                  {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  {running ? 'Running\u2026' : 'Run Code'}
                </button>
              </div>
            </div>
            <div
              ref={outputRef}
              style={{
                flex: 1, overflow: 'auto', padding: 12,
                fontFamily: "'Fira Code', 'Consolas', monospace", fontSize: 13,
                background: '#0f172a', color: '#e2e8f0',
              }}
            >
              {running && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366f1', padding: '8px 0' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Executing code...</span>
                </div>
              )}

              {!running && activeTab === 'output' && (stdout || stderr || compileOutput || executionTime !== null) && (
                <div>
                  {executionTime !== null && (
                    <div style={{
                      display: 'flex', gap: 16, marginBottom: 8, padding: '6px 10px',
                      background: '#1e293b', borderRadius: 6, fontSize: 11,
                    }}>
                      <span style={{ color: '#6366f1' }}>
                        Status: <strong style={{ color: executionStatus === 'ACCEPTED' ? '#4ade80' : '#f87171' }}>{executionStatus}</strong>
                      </span>
                      <span style={{ color: '#94a3b8' }}>
                        Time: <strong>{typeof executionTime === 'number' ? executionTime.toFixed(3) : executionTime}s</strong>
                      </span>
                      <span style={{ color: '#94a3b8' }}>
                        Memory: <strong>{typeof memoryUsed === 'number' ? Math.round(memoryUsed) : memoryUsed} MB</strong>
                      </span>
                      {exitCode !== null && (
                        <span style={{ color: '#94a3b8' }}>
                          Exit Code: <strong>{exitCode}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {compileOutput && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>Compilation Output</div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#fca5a5', background: '#1e293b', padding: '8px 10px', borderRadius: 6, border: '1px solid #78350f' }}>{compileOutput}</pre>
                    </div>
                  )}

                  {stderr && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>Stderr / Runtime Error</div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#fca5a5', background: '#1e293b', padding: '8px 10px', borderRadius: 6, border: '1px solid #7f1d1d' }}>{stderr}</pre>
                    </div>
                  )}

                  {stdout ? (
                    <div>
                      <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>Program Output</div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>{stdout}</pre>
                    </div>
                  ) : (
                    !compileOutput && !stderr && executionStatus === 'ACCEPTED' && (
                      <div style={{ color: '#64748b', fontStyle: 'italic' }}>Program executed successfully (no output)</div>
                    )
                  )}

                  {!stdout && !stderr && !compileOutput && executionStatus && executionStatus !== 'ACCEPTED' && (
                    <div style={{ color: '#f87171' }}>Execution failed with status: {executionStatus}</div>
                  )}
                </div>
              )}

              {!running && activeTab === 'testResults' && testResults.length > 0 && (
                <div>
                  <div style={{ marginBottom: 8, fontWeight: 700, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Test Results ({testResults.filter(t => t.passed).length}/{testResults.length})
                  </div>
                  {testResults.map((tr, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4,
                      borderRadius: 6, background: tr.passed ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)',
                    }}>
                      {tr.passed ? <Check size={12} color="#4ade80" /> : <X size={12} color="#f87171" />}
                      <span style={{ color: tr.passed ? '#86efac' : '#fca5a5', fontSize: 12 }}>
                        {tr.isHidden ? 'Hidden Test' : `Test ${i + 1}`}
                        {!tr.isHidden && tr.input && <span style={{ color: '#94a3b8' }}> &mdash; Input: {tr.input}</span>}
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 10 }}>
                        {tr.executionTime != null ? `${Number(tr.executionTime).toFixed(3)}s` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!running && !stdout && !stderr && !compileOutput && executionTime === null && testResults.length === 0 && (
                <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                  <Terminal size={14} />
                  Run your code to see output here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ParticipantCodingAttemptPage({ user }) {
  return (
    <ProctorProvider>
      <ParticipantCodingAttemptInner user={user} />
    </ProctorProvider>
  )
}