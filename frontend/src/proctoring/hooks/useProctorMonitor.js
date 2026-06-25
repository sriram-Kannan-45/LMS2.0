/**
 * useProctorMonitor — keeps a live `sessions` map for one quiz, fed by
 * REST (initial snapshot) + socket (incremental updates).
 *
 * Also manages trainer-side WebRTC: observe/unobserve participants to
 * receive their live screen-share streams.
 *
 * Returns: { sessions, refresh, forceTerminate, isLoading, error,
 *            observedStreams, observe, unobserve, observedSessions }
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { proctorApi } from '../api';
import { useSocket, useSocketEvent } from '../../hooks/useSocket';
import { STUN_SERVERS } from '../constants';

export default function useProctorMonitor(quizId) {
  const [byId, setById] = useState(new Map());
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [observedStreams, setObservedStreams] = useState(new Map());
  const peerConnections = useRef(new Map()); // Map<sessionId, RTCPeerConnection>
  const { socket } = useSocket();

  const merge = useCallback((row) => {
    if (!row) return;
    setById(prev => {
      const next = new Map(prev);
      const existing = next.get(row.sessionId) || {};
      next.set(row.sessionId, { ...existing, ...row });
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    try {
      const list = await proctorApi.getQuizMonitor(quizId);
      const next = new Map();
      for (const r of list) next.set(r.sessionId, r);
      setById(next);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  // Initial fetch
  useEffect(() => { refresh(); }, [refresh]);

  // Trainer-side socket subscription
  useEffect(() => {
    if (!socket || !quizId) return;
    socket.emit('proctor:trainerJoin', { quizId }, (ack) => {
      if (ack?.ok && Array.isArray(ack.sessions)) {
        const next = new Map();
        for (const r of ack.sessions) next.set(r.sessionId, r);
        setById(next);
        setLoading(false);
      }
    });
    return () => socket.emit('proctor:trainerLeave', { quizId });
  }, [socket, quizId]);

  // Live incremental updates
  useSocketEvent('proctor:update', (msg) => {
    if (msg?.session) merge({ ...msg.session, lastEvent: msg.type, lastViolation: msg.violation });
  }, []);

  useSocketEvent('proctor:heartbeat', (msg) => {
    if (msg?.sessionId) merge({ sessionId: msg.sessionId, lastHeartbeatAt: msg.at });
  }, []);

  useSocketEvent('proctor:screen-frame', (msg) => {
    if (msg?.sessionId && msg?.screenshot) {
      merge({ sessionId: msg.sessionId, latestScreenshot: msg.screenshot.filePath });
    }
  }, []);

  // ── WebRTC: receive offer from participant via server relay ────────────
  useSocketEvent('proctor:webrtc-offer', async ({ sessionId, sdp }) => {
    if (!socket) return;
    // Close existing PC for this session if any
    const existing = peerConnections.current.get(sessionId);
    if (existing) { existing.close(); peerConnections.current.delete(sessionId); }

    try {
      const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peerConnections.current.set(sessionId, pc);

      const streams = { screen: null, webcam: null };

      pc.ontrack = (event) => {
        if (!event.streams?.[0]) return;
        // Try to identify track type by label
        const track = event.track;
        const isWebcam = track.label?.toLowerCase().includes('camera') ||
                         track.kind === 'audio' ||
                         false;
        if (isWebcam) {
          if (!streams.webcam) {
            streams.webcam = new MediaStream([track]);
          } else {
            streams.webcam.addTrack(track);
          }
        } else {
          if (!streams.screen) {
            streams.screen = new MediaStream([track]);
          } else {
            streams.screen.addTrack(track);
          }
        }
        // Store combined streams in observedStreams
        setObservedStreams(prev => {
          const next = new Map(prev);
          next.set(sessionId, { screen: streams.screen, webcam: streams.webcam });
          return next;
        });
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('proctor:ice-candidate', { sessionId, candidate: e.candidate.toJSON() });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) {
          setObservedStreams(prev => {
            const next = new Map(prev);
            next.delete(sessionId);
            return next;
          });
          peerConnections.current.delete(sessionId);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('proctor:webrtc-answer', { sessionId, sdp: pc.localDescription });
    } catch (err) {
      console.warn('WebRTC answer creation failed for session', sessionId, err);
    }
  }, [socket]);

  // ── WebRTC: receive ICE candidate from participant via server relay ────
  useSocketEvent('proctor:ice-candidate', ({ sessionId, candidate }) => {
    const pc = peerConnections.current.get(sessionId);
    if (!pc || !candidate) return;
    try {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('addIceCandidate failed', err);
    }
  }, []);

  // ── Observe: request to start watching a participant's screen ─────────
  const observe = useCallback((sessionId) => {
    if (!socket) return;
    socket.emit('proctor:observe', { sessionId }, (ack) => {
      if (!ack?.ok) console.warn('Observe request rejected', ack?.error);
    });
  }, [socket]);

  // ── Unobserve: stop watching a participant's screen ───────────────────
  const unobserve = useCallback((sessionId) => {
    if (!socket) return;
    socket.emit('proctor:unobserve', { sessionId });
    const pc = peerConnections.current.get(sessionId);
    if (pc) { pc.close(); peerConnections.current.delete(sessionId); }
    setObservedStreams(prev => {
      const next = new Map(prev);
      next.delete(sessionId);
      return next;
    });
  }, [socket]);

  // Cleanup all peer connections on unmount
  useEffect(() => () => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
  }, []);

  const sessions = useMemo(
    () => Array.from(byId.values()).sort(
      (a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0),
    ),
    [byId],
  );

  const forceTerminate = useCallback(async (sessionId, reason) => {
    await proctorApi.forceTerminate(sessionId, reason || 'Trainer terminated');
    // Clean up WebRTC if observing
    unobserve(sessionId);
  }, [unobserve]);

  const observedSessions = useMemo(
    () => Array.from(observedStreams.keys()),
    [observedStreams],
  );

  return {
    sessions, refresh, forceTerminate, isLoading, error,
    observedStreams, observe, unobserve, observedSessions,
  };
}
