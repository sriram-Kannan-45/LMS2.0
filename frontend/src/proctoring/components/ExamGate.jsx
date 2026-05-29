/**
 * ExamGate — pre-exam readiness checklist.
 *
 *   1. Auth-ready (user.id present)
 *   2. Device fingerprint computed
 *   3. Internet stable
 *   4. Screen sharing active
 *   5. Fullscreen entered
 *
 * "Begin exam" is disabled until ALL of [user.id, quizId, all checks]
 * are truthy. On click: starts (or resumes) the proctoring session,
 * activates it, then hands the caller a sessionId so the route can
 * navigate to /exam/:sessionId.
 *
 * Layout: split screen on desktop (illustration left, checklist right);
 * stacked on mobile.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Loader2, Clock, Lock, Eye, Wifi, MonitorPlay, Maximize2 } from 'lucide-react';

import { useProctor } from '../ProctorContext';
import useAuthUser from '../hooks/useAuthUser';
import useDeviceFingerprint from '../hooks/useDeviceFingerprint';
import useScreenShare from '../hooks/useScreenShare';
import useFullscreen from '../hooks/useFullscreen';
import useNetworkStatus from '../hooks/useNetworkStatus';

const Step = ({ icon: Icon, label, ok, active, hint }) => (
  <div
    className="flex items-start gap-3 rounded-lg border px-4 py-3 transition"
    style={{
      borderColor: ok ? '#a7f3d0' : active ? '#c7d2fe' : '#e2e8f0',
      background: ok ? '#ecfdf5' : active ? '#eef2ff' : '#f8fafc',
    }}
  >
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
      style={{
        background: ok ? '#10b981' : active ? '#4f46e5' : '#cbd5e1',
        color: '#ffffff',
      }}
    >
      {ok ? '✓' : <Icon className="h-4 w-4" />}
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold" style={{ color: ok ? '#065f46' : '#1e293b' }}>
        {label}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs" style={{ color: ok ? '#047857' : '#64748b' }}>
          {hint}
        </p>
      )}
    </div>
  </div>
);

export default function ExamGate({ quizId, quizTitle, attemptId, onReady, onCancel }) {
  const proctor = useProctor();
  const { userId, ready: authReady } = useAuthUser();
  const fp = useDeviceFingerprint();
  const isOnline = useNetworkStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const justActivated = useRef(false);

  const screenShare = useScreenShare({
    onStop: () => proctor.report?.('SCREEN_SHARE_STOPPED'),
    onDenied: () => proctor.report?.('SCREEN_SHARE_DENIED'),
  });

  const fullscreen = useFullscreen({
    onExit: () => proctor.report?.('FULLSCREEN_EXIT'),
  });

  // Only navigate after the user explicitly clicked Begin (justActivated flag)
  useEffect(() => {
    if (justActivated.current && proctor.isActive && proctor.session?.sessionId) {
      onReady?.(proctor.session);
    }
  }, [proctor.isActive, proctor.session?.sessionId, onReady]);

  const checksPassed =
    !!fp && screenShare.isSharing && fullscreen.isFullscreen && isOnline;
  const canBegin =
    authReady && !!userId && !!quizId && checksPassed && !busy;

  const handleBegin = async () => {
    setError(null);
    setBusy(true);
    try {
      // 1. Screen share if not already
      let stream = screenShare.stream;
      if (!stream) {
        stream = await screenShare.request();
        if (!stream) throw new Error('Screen sharing was denied');
      }
      // 2. Fullscreen
      if (!fullscreen.isFullscreen) {
        const ok = await fullscreen.request();
        if (!ok) throw new Error('Could not enter fullscreen');
      }
      // 3. Start proctoring session (re-uses existing attemptId if supplied)
      await proctor.start({
        quizId,
        attemptId,
        fingerprintHash: fp,
        screenSharing: true,
      });
      // 4. Activate
      justActivated.current = true;
      await proctor.activate();
      // useEffect above will fire onReady -> route navigates
    } catch (e) {
      setError(e?.message || 'Failed to start exam');
    } finally {
      setBusy(false);
    }
  };

  // Loading state while auth resolves
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:py-16">
        {/* ── LEFT: brand + illustration + rules ─────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="relative flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Proctored Examination
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              {quizTitle || 'Secure Exam Setup'}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
              Complete the readiness checklist to begin your timed assessment.
              Your session is monitored, your screen is shared with your
              instructor, and your answers are saved automatically.
            </p>
          </div>

          {/* Shield illustration */}
          <div className="my-8 hidden items-center justify-center lg:flex">
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-blue-200/40 blur-3xl" aria-hidden />
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-blue-100 bg-white shadow-[0_30px_60px_-30px_rgba(30,64,175,0.4)]">
                <ShieldCheck className="h-24 w-24 text-blue-600" strokeWidth={1.4} />
              </div>
              <div className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Exam rules */}
          <div
            className="rounded-xl border bg-white p-5 shadow-sm"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Exam Rules</p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-600">
                  <li>• You must remain in fullscreen the entire time.</li>
                  <li>• Tab switching, copy/paste, and dev-tools are disabled.</li>
                  <li>• 3 fullscreen exits or 5 warnings auto-submit your exam.</li>
                  <li>• Your screen is shared with your instructor.</li>
                  <li>• Answers autosave every few seconds — refreshing won't lose progress.</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── RIGHT: readiness card ──────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="relative"
        >
          <div
            className="rounded-2xl border bg-white/95 p-6 shadow-[0_10px_40px_-15px_rgba(30,64,175,0.2)] backdrop-blur sm:p-8"
            style={{ borderColor: '#e2e8f0' }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Readiness checklist</h2>
              <span className="text-xs font-medium text-slate-500">
                {[!!userId, !!fp, isOnline, screenShare.isSharing, fullscreen.isFullscreen].filter(Boolean).length}/5
              </span>
            </div>

            <div className="space-y-2.5">
              <Step
                icon={Eye}
                label="Authentication verified"
                ok={!!userId}
                active={!userId}
                hint={userId ? `Signed in (id ${userId})` : 'Resolving sign-in…'}
              />
              <Step
                icon={Lock}
                label="Device fingerprint registered"
                ok={!!fp}
                active={!fp}
                hint={fp ? 'Device recognised' : 'Generating fingerprint…'}
              />
              <Step
                icon={Wifi}
                label="Internet connection stable"
                ok={isOnline}
                active={!isOnline}
                hint={isOnline ? 'Connected' : 'Waiting for connection'}
              />
              <Step
                icon={MonitorPlay}
                label="Screen sharing active"
                ok={screenShare.isSharing}
                active={!screenShare.isSharing && !!fp}
                hint={
                  screenShare.isSharing
                    ? 'Your screen is being shared with your instructor'
                    : 'You\'ll be prompted to share your entire screen'
                }
              />
              <Step
                icon={Maximize2}
                label="Fullscreen mode"
                ok={fullscreen.isFullscreen}
                active={!fullscreen.isFullscreen && screenShare.isSharing}
                hint={fullscreen.isFullscreen ? 'Locked into fullscreen' : 'Click Begin to enter fullscreen'}
              />
            </div>

            <AnimatePresence>
              {(error || proctor.errorMessage) && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {error || proctor.errorMessage}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-6 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleBegin}
                disabled={!canBegin}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background:
                    'linear-gradient(135deg,#2563eb 0%,#0ea5e9 100%)',
                  boxShadow: canBegin ? '0 8px 20px -8px rgba(37,99,235,0.55)' : 'none',
                }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {busy ? 'Starting…' : 'Begin Secure Exam'}
              </button>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              By starting, you agree to be monitored for the duration of this exam.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
