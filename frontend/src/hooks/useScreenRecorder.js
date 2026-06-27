import { useState, useRef, useCallback, useEffect } from 'react'
import { API_BASE } from '../api/api'

export default function useScreenRecorder({
  assessmentType = 'quiz',
  assessmentId,
  codingAttemptId,
  participantId,
  sessionId,
  userToken,
  autoStop = true,
} = {}) {
  // autoStop: when false, the recorder keeps running even if the React component
  // unmounts. This is required for flows that navigate to a separate exam route
  // while the screen recording must continue.
  const [recording, setRecording] = useState(false)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [chunks, setChunks] = useState([])
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: false
      })
      streamRef.current = mediaStream
      setStream(mediaStream)

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm'

      const recorder = new MediaRecorder(mediaStream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          setChunks([...chunksRef.current])
        }
      }

      recorder.onstop = () => {
        setRecording(false)
        setStream(null)
      }

      recorder.start(5000)
      setRecording(true)
      setError(null)
      return true
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Screen sharing was denied. Please allow screen sharing for proctored quizzes.')
      } else {
        setError(err.message || 'Failed to start screen recording')
      }
      return false
    }
  }, [])

  const stopRecording = useCallback(async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null)
        return
      }

      const originalOnStop = mediaRecorderRef.current.onstop
      mediaRecorderRef.current.onstop = () => {
        setRecording(false)
        setStream(null)
        if (originalOnStop) originalOnStop()
      }

      mediaRecorderRef.current.stop()

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      resolve(blob)
    })
  }, [])

  const uploadRecording = useCallback(async (blob) => {
    if (!blob || !assessmentId || !participantId || !sessionId) return null
    try {
      const formData = new FormData()
      formData.append('recording', blob, `${assessmentType}_${assessmentId}_${participantId}_${Date.now()}.webm`)
      formData.append('assessment_type', assessmentType)
      formData.append('participantId', participantId)
      formData.append('sessionId', sessionId)
      if (assessmentType === 'quiz') {
        formData.append('quizId', assessmentId)
      } else if (assessmentType === 'coding_assessment') {
        formData.append('assessmentId', assessmentId)
        if (codingAttemptId) formData.append('codingAttemptId', codingAttemptId)
      }

      const res = await fetch(`${API_BASE}/recordings/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')
      return data.data
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [assessmentType, assessmentId, codingAttemptId, participantId, sessionId, userToken])

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setRecording(false)
    setStream(null)
  }, [])

  useEffect(() => {
    if (autoStop === false) return
    return () => cleanup()
  }, [cleanup, autoStop])

  return {
    recording,
    stream,
    error,
    chunks,
    startRecording,
    stopRecording,
    uploadRecording,
    cleanup
  }
}
