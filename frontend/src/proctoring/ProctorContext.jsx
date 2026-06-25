/**
 * ProctorContext — single source of truth for the participant-side
 * proctoring state machine.
 *
 * Hardening (production):
 *  - Never fires an API call until the auth user id is known
 *    (prevents the "WHERE participant_id has invalid undefined value" bug).
 *  - Normalises server errors into human-readable messages.
 *  - Debounces violation reports (1.5s per type) to avoid hammering.
 *  - Server is the source of truth for warnings, exits, and endsAt.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { proctorApi } from './api';
import useAuthUser from './hooks/useAuthUser';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { HEARTBEAT_INTERVAL_MS, VIOLATION_LABELS, STUN_SERVERS } from './constants';
import { captureFrame } from '../utils/captureFrame';

const ProctorContext = createContext(null);

function humanise(err) {
  if (!err) return null;
  const msg = err.message || 'Something went wrong';
  // Map known server codes to friendly text
  if (err.code === 'AUTH_USER_ID_MISSING') return 'Your session has expired — please sign in again.';
  if (err.code === 'NETWORK_ERROR') return 'Network error — please check your connection.';
  // Sequelize raw errors that shouldn't be exposed
  if (/has invalid "undefined" value/i.test(msg)) {
    return 'We could not load your account — please refresh and sign in again.';
  }
  return msg;
}

export function ProctorProvider({ children }) {
  const { userId, ready: authReady } = useAuthUser();
  const [session, setSession] = useState(null);
  const [lastWarning, setLastWarning] = useState(null);
  const [error, setError] = useState(null);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [violationLog, setViolationLog] = useState([]);
  const [proctorStream, setProctorStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectionCountdown, setReconnectionCountdown] = useState(null);
  const [trainerMessages, setTrainerMessages] = useState([]);
  const lastReportRef = useRef(new Map());
  const reconnectionTimerRef = useRef(null);
  const viewerPcsRef = useRef(new Map()); // Map<viewerId, RTCPeerConnection>
  const { socket } = useSocket();

  // Clean up reconnection timer
  useEffect(() => () => {
    if (reconnectionTimerRef.current) clearInterval(reconnectionTimerRef.current);
  }, []);

  // Resume any active session — only after auth is ready and we have a userId
  useEffect(() => {
    if (!authReady || !userId) return;
    let alive = true;
    proctorApi.getActiveSession().then(s => {
      if (alive && s) setSession(s);
    }).catch((e) => { /* don't block UI for this background fetch */ });
    return () => { alive = false; };
  }, [authReady, userId]);

  // Heartbeat — REST + socket every HEARTBEAT_INTERVAL_MS while ACTIVE
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE') return;
    const id = setInterval(() => {
      proctorApi.heartbeat(session.sessionId, session.sessionToken).catch(() => {});
      socket?.emit('proctor:heartbeat', { sessionId: session.sessionId });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [session?.sessionId, session?.sessionToken, session?.status, socket]);

  // Periodic screen capture uploads (every 30 seconds)
  useEffect(() => {
    if (!socket || !session || session.status !== 'ACTIVE' || !screenStream) return;

    const captureInterval = setInterval(async () => {
      try {
        const dataUrl = await captureFrame(screenStream, 0.4);
        if (dataUrl) {
          socket.emit('proctor:screen-frame', {
            sessionId: session.sessionId,
            imageBase64: dataUrl,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.warn('Screen capture failed', err);
      }
    }, 30000);

    return () => clearInterval(captureInterval);
  }, [socket, session?.sessionId, session?.status, screenStream]);

  // Join session room as soon as we have a session
  useEffect(() => {
    if (!socket || !session?.sessionId) return;
    socket.emit('proctor:join', { sessionId: session.sessionId }, (ack) => {
      if (ack?.session) setSession(prev => ({ ...prev, ...ack.session }));
    });
  }, [socket, session?.sessionId]);

  // Server-pushed forced termination
  useSocketEvent('proctor:terminated', (msg) => {
    setSession(prev => prev ? { ...prev, status: 'TERMINATED', terminationReason: msg?.reason } : prev);
  }, []);

  useSocketEvent('proctor:warning', (msg) => {
    setLastWarning({ ...msg, at: Date.now() });
  }, []);

  useSocketEvent('proctor:multipleLogin', () => {
    setSession(prev => prev ? {
      ...prev, status: 'TERMINATED', terminationReason: 'Logged in from another device',
    } : prev);
  }, []);

  // ── Grace period reconnection ──────────────────────────────────────────
  useSocketEvent('proctor:reconnected', (msg) => {
    if (msg?.session) {
      setSession(prev => ({ ...prev, ...msg.session }));
      setIsReconnecting(false);
      setReconnectionCountdown(null);
      if (reconnectionTimerRef.current) clearInterval(reconnectionTimerRef.current);
    }
  }, []);

  // ── Trainer message ────────────────────────────────────────────────────
  useSocketEvent('proctor:trainerMessage', (msg) => {
    if (msg?.message) {
      setTrainerMessages(prev => [...prev, { ...msg, id: Date.now() }]);
      setLastWarning({ type: 'TRAINER_WARNING', message: msg.message, at: Date.now() });
    }
  }, []);

  // ── WebRTC: observe-request from trainer (participant side) ────────────
  useSocketEvent('proctor:observe-request', async ({ sessionId, viewerId }) => {
    if (!socket) return;
    // Need at least the screen stream to share
    const screen = screenStream;
    const webcam = proctorStream;
    if (!screen) return;
    try {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      viewerPcsRef.current.set(viewerId, pc);

      // Add screen share tracks
      screen.getTracks().forEach(track => pc.addTrack(track, screen));
      // Optionally add webcam tracks
      if (webcam) {
        webcam.getTracks().forEach(track => pc.addTrack(track, webcam));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('proctor:ice-candidate', { sessionId, viewerId, candidate: e.candidate.toJSON() });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) {
          viewerPcsRef.current.delete(viewerId);
          pc.close();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('proctor:webrtc-offer', { sessionId, viewerId, sdp: pc.localDescription });
    } catch (err) {
      console.warn('WebRTC offer creation failed', err);
    }
  }, [socket, screenStream, proctorStream]);

  // ── WebRTC: answer from trainer ────────────────────────────────────────
  useSocketEvent('proctor:webrtc-answer', ({ sessionId, viewerId, sdp }) => {
    const pc = viewerPcsRef.current.get(viewerId);
    if (!pc) return;
    try {
      pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.warn('WebRTC setRemote failed', err);
    }
  }, []);

  // ── WebRTC: ICE candidate from trainer ─────────────────────────────────
  useSocketEvent('proctor:ice-candidate', ({ sessionId, viewerId, candidate }) => {
    const pc = viewerPcsRef.current.get(viewerId);
    if (!pc || !candidate) return;
    try {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('WebRTC addIceCandidate failed', err);
    }
  }, []);

  // ── WebRTC: unobserve-request from trainer ─────────────────────────────
  useSocketEvent('proctor:unobserve-request', ({ sessionId, viewerId }) => {
    const pc = viewerPcsRef.current.get(viewerId);
    if (pc) {
      pc.close();
      viewerPcsRef.current.delete(viewerId);
    }
  }, []);

  const start = useCallback(async ({ quizId, attemptId, fingerprintHash, screenSharing }) => {
    setError(null);
    if (!authReady) {
      const err = new Error('Authentication still loading — please wait a moment');
      setError(err); throw err;
    }
    if (!userId) {
      const err = new Error('Please sign in again before starting the exam');
      err.code = 'AUTH_USER_ID_MISSING';
      setError(err); throw err;
    }
    if (!quizId) {
      const err = new Error('Quiz id missing');
      setError(err); throw err;
    }
    try {
      const s = await proctorApi.startSession({ quizId, attemptId, fingerprintHash, screenSharing });
      setSession(s);
      return s;
    } catch (e) {
      e.message = humanise(e) || e.message;
      setError(e);
      throw e;
    }
  }, [authReady, userId]);

  const activate = useCallback(async () => {
    if (!session) return;
    const s = await proctorApi.activate(session.sessionId, session.sessionToken);
    setSession(prev => ({ ...prev, ...s }));
    return s;
  }, [session]);

  const submit = useCallback(async () => {
    if (!session) return;
    const s = await proctorApi.submit(session.sessionId, session.sessionToken);
    setSession(prev => ({ ...prev, ...s }));
    return s;
  }, [session]);

  const terminate = useCallback(async (reason) => {
    if (!session) return;
    const s = await proctorApi.terminate(session.sessionId, session.sessionToken, reason);
    setSession(prev => ({ ...prev, ...s }));
    return s;
  }, [session]);

  const report = useCallback((type, message, metadata) => {
    if (!session) return;
    const now = Date.now();
    const last = lastReportRef.current.get(type) || 0;
    if (now - last < 1500) return;
    lastReportRef.current.set(type, now);

    const logMsg = message || VIOLATION_LABELS[type];
    setLastWarning({ type, message: logMsg, at: now });

    setViolationLog(prev => [
      ...prev,
      { type, timestamp: now, meta: metadata || {} }
    ]);

    socket?.emit('proctor:violation', {
      sessionId: session.sessionId, type, message, metadata,
    });
    proctorApi.recordViolation(session.sessionId, session.sessionToken, {
      type, message, metadata,
    }).then(({ session: srv, terminated }) => {
      if (srv) setSession(prev => ({ ...prev, ...srv }));
      if (terminated) setSession(prev => prev && { ...prev, status: 'TERMINATED' });
    }).catch(() => {});
  }, [session, socket]);

  const pushState = useCallback((flags) => {
    if (!session || !socket) return;
    socket.emit('proctor:state', { sessionId: session.sessionId, ...flags });
  }, [session, socket]);

  const reset = useCallback(() => {
    setSession(null); setLastWarning(null); setError(null);
    setCameraGranted(false); setMicGranted(false); setViolationLog([]);
    lastReportRef.current.clear();
  }, []);

  const value = useMemo(() => ({
    session,
    userId,
    authReady,
    warningsCount: session?.warningsCount || 0,
    fullscreenExits: session?.fullscreenExits || 0,
    isActive: session?.status === 'ACTIVE',
    isPending: session?.status === 'PENDING',
    isTerminated: ['TERMINATED', 'EXPIRED'].includes(session?.status),
    isSubmitted: session?.status === 'SUBMITTED',
    isLocked: ['TERMINATED', 'EXPIRED'].includes(session?.status) || session?.isLocked || false,
    error,
    errorMessage: humanise(error),
    lastWarning,
    cameraGranted,
    setCameraGranted,
    micGranted,
    setMicGranted,
    violationLog,
    setViolationLog,
    proctorStream,
    setProctorStream,
    screenStream,
    setScreenStream,
    isReconnecting,
    reconnectionCountdown,
    trainerMessages,
    // Category violation counters synced from session view
    fullscreenViolations: session?.fullscreenViolations || 0,
    tabSwitchViolations: session?.tabSwitchViolations || 0,
    screenshotViolations: session?.screenshotViolations || 0,
    devToolsViolations: session?.devToolsViolations || 0,
    windowBlurViolations: session?.windowBlurViolations || 0,
    start, activate, submit, terminate, report, pushState, reset,
  }), [
    session, userId, authReady, error, lastWarning, cameraGranted, micGranted,
    violationLog, proctorStream, screenStream, isReconnecting, reconnectionCountdown, trainerMessages,
    start, activate, submit, terminate, report, pushState, reset,
  ]);

  return (
    <ProctorContext.Provider value={value}>
      {children}
    </ProctorContext.Provider>
  );
}

export function useProctor() {
  const ctx = useContext(ProctorContext);
  if (!ctx) {
    throw new Error('useProctor must be used inside <ProctorProvider>');
  }
  return ctx;
}
