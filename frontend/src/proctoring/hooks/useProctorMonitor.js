/**
 * useProctorMonitor — keeps a live `sessions` map for one quiz, fed by
 * REST (initial snapshot) + socket (incremental updates).
 *
 * Returns: { sessions, refresh, forceTerminate, isLoading, error }
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { proctorApi } from '../api';
import { useSocket, useSocketEvent } from '../../hooks/useSocket';

export default function useProctorMonitor(quizId) {
  const [byId, setById] = useState(new Map());
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const sessions = useMemo(
    () => Array.from(byId.values()).sort(
      (a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0),
    ),
    [byId],
  );

  const forceTerminate = useCallback(async (sessionId, reason) => {
    await proctorApi.forceTerminate(sessionId, reason || 'Trainer terminated');
  }, []);

  return { sessions, refresh, forceTerminate, isLoading, error };
}
