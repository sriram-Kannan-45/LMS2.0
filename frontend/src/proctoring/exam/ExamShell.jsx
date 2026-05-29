/**
 * ExamShell — top-level container for the classical /exam/:sessionId page.
 *
 * Owns the full exam state machine:
 *   - answers: Map<questionId, { selectedOption?, answerText? }>
 *   - flagged: Set<questionId>
 *   - currentIndex: number
 *   - timeLeft: derived from server endsAt (single source of truth)
 *   - submitting: useRef (idempotent guard)
 *
 * Behaviours:
 *   - Server hydration via GET /api/proctor/sessions/:id/exam
 *   - Autosave via POST /sessions/:id/answers every 8s when dirty
 *   - Final autosave on every navigation (next / prev / jump)
 *   - Anti-cheat hooks active only during ACTIVE status
 *   - Auto-submit on timer expire (calls submit only once)
 *   - Toast warnings at 5:00 and 1:00 remaining
 *   - Refresh recovery: on mount, if endsAt has passed, submit immediately
 *   - beforeunload prompt to prevent accidental refresh
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './exam.css';

import { proctorApi } from '../api';
import { useProctor } from '../ProctorContext';
import { useToast } from '../../components/Toast';
import useExamTimer from '../hooks/useExamTimer';
import useAntiCheat from '../hooks/useAntiCheat';
import useTabVisibility from '../hooks/useTabVisibility';
import useFullscreen from '../hooks/useFullscreen';

import TopBar from './TopBar';
import QuestionNavigator from './QuestionNavigator';
import QuestionCard from './QuestionCard';
import StatsFooter from './StatsFooter';

const AUTOSAVE_MS = 8_000;

export default function ExamShell({ sessionId, onSubmitted }) {
  const navigate = useNavigate();
  const proctor = useProctor();
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();

  // ── Hydration state ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);     // { session, quiz, questions, savedAnswers }

  // ── Exam state ─────────────────────────────────────────────────────────
  const [answers, setAnswers] = useState(() => new Map());
  const [flagged, setFlagged] = useState(() => new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Refs that must not trigger renders
  const submittingRef = useRef(false);            // idempotent guard
  const dirtyRef = useRef(new Set());             // questionIds with unsaved changes
  const fiveWarnedRef = useRef(false);
  const oneWarnedRef = useRef(false);

  const session = data?.session || null;
  const questions = data?.questions || [];
  const total = questions.length;
  const currentQ = questions[currentIndex];

  // ── 1. Server hydration on mount ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    setLoading(true);
    setLoadError(null);

    // We need the sessionToken to hit /exam — but we get it from the
    // session object. Pull it via the active-session endpoint first to
    // get the token, then load the exam payload. Both calls run in parallel
    // when proctor.session is already populated.
    const ensureToken = async () => {
      if (proctor.session && Number(proctor.session.sessionId) === Number(sessionId)) {
        return proctor.session.sessionToken;
      }
      const active = await proctorApi.getActiveSession();
      if (!active || Number(active.sessionId) !== Number(sessionId)) {
        throw new Error('No active proctored session for this exam');
      }
      return active.sessionToken;
    };

    (async () => {
      try {
        const token = await ensureToken();
        const payload = await proctorApi.getExamData(sessionId, token);
        if (!alive) return;

        setData(payload);

        // Hydrate answers + flagged from saved server state (resume protection)
        const m = new Map();
        for (const a of payload.savedAnswers || []) {
          m.set(a.questionId, {
            selectedOption: a.selectedOption ?? null,
            answerText: a.answerText || '',
          });
        }
        setAnswers(m);
        setLoading(false);

        // Refresh-recovery: if endsAt has already passed, auto-submit immediately
        if (payload.session?.endsAt && new Date(payload.session.endsAt).getTime() <= Date.now()) {
          await submitExam(token, payload.session.sessionId, /* silent */ true);
        }
      } catch (e) {
        if (!alive) return;
        setLoadError(e.message || 'Failed to load the exam');
        setLoading(false);
      }
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── 2. Server-driven countdown ────────────────────────────────────────
  const timeLeft = useExamTimer(session?.endsAt, {
    onExpire: () => { void submitExam(); },
  });

  useEffect(() => {
    if (timeLeft == null) return;
    if (timeLeft <= 300 && !fiveWarnedRef.current) {
      fiveWarnedRef.current = true;
      toastInfo('5 minutes remaining');
    }
    if (timeLeft <= 60 && !oneWarnedRef.current) {
      oneWarnedRef.current = true;
      toastError('1 minute remaining — finalize your answers');
    }
  }, [timeLeft, toastInfo, toastError]);

  // ── 3. Anti-cheat (only while session ACTIVE) ─────────────────────────
  const isActive = proctor.isActive;

  useAntiCheat({
    enabled: isActive && !submitting,
    onViolation: (type, meta) => proctor.report(type, undefined, meta),
  });

  useTabVisibility({
    enabled: isActive && !submitting,
    onHidden: () => proctor.report('TAB_SWITCH'),
    onBlur:   () => proctor.report('WINDOW_BLUR'),
  });

  useFullscreen({
    enabled: isActive && !submitting,
    onExit: async () => {
      proctor.report('FULLSCREEN_EXIT');
      // Best-effort: re-enter fullscreen automatically (browser permitting)
      try { await document.documentElement.requestFullscreen?.(); } catch { /* user has to re-enter manually */ }
    },
  });

  // ── 4. beforeunload guard (prevent accidental refresh losing answers) ─
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isActive]);

  // ── 5. Autosave loop (server is source of truth) ──────────────────────
  const flushDirty = useCallback(async () => {
    if (!session || dirtyRef.current.size === 0) return;
    const ids = Array.from(dirtyRef.current);
    dirtyRef.current.clear();
    const payload = ids
      .map(qid => {
        const a = answers.get(qid);
        if (!a) return null;
        return {
          questionId: qid,
          selectedOption: a.selectedOption ?? null,
          answerText: a.answerText ?? '',
        };
      })
      .filter(Boolean);
    if (!payload.length) return;
    try {
      await proctorApi.saveAnswers(session.sessionId, session.sessionToken, payload);
    } catch (e) {
      // Re-mark dirty so next tick retries; never block the UI
      ids.forEach(id => dirtyRef.current.add(id));
    }
  }, [session, answers]);

  useEffect(() => {
    if (!session || submitting) return;
    const id = setInterval(flushDirty, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [session, submitting, flushDirty]);

  // ── 6. Answer / flag mutations ────────────────────────────────────────
  const updateAnswer = useCallback((questionId, patch) => {
    setAnswers(prev => {
      const next = new Map(prev);
      const cur = next.get(questionId) || { selectedOption: null, answerText: '' };
      next.set(questionId, { ...cur, ...patch });
      return next;
    });
    dirtyRef.current.add(questionId);
  }, []);

  const toggleFlag = useCallback((questionId) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const goTo = useCallback(async (idx) => {
    if (idx < 0 || idx >= total) return;
    await flushDirty();
    setCurrentIndex(idx);
  }, [total, flushDirty]);

  // ── 7. Submit (idempotent) ────────────────────────────────────────────
  const submitExam = useCallback(async (overrideToken, overrideSessionId, silent = false) => {
    if (submittingRef.current) return;          // idempotent guard
    submittingRef.current = true;
    setSubmitting(true);

    const sId = overrideSessionId ?? session?.sessionId;
    const sToken = overrideToken ?? session?.sessionToken;
    if (!sId || !sToken) { submittingRef.current = false; setSubmitting(false); return; }

    try {
      // Final flush of dirty answers
      const finalAnswers = Array.from(answers.entries()).map(([questionId, a]) => ({
        questionId,
        selectedOption: a.selectedOption ?? null,
        answerText: a.answerText ?? '',
      }));

      const result = await proctorApi.finalize(sId, sToken, finalAnswers);

      if (!silent) {
        toastSuccess('Exam submitted successfully');
      }
      onSubmitted?.(result);
      navigate(`/exam/${sId}/result`, { replace: true });
    } catch (e) {
      submittingRef.current = false;
      setSubmitting(false);
      if (!silent) toastError(e.message || 'Submit failed — try again');
    }
  }, [session, answers, onSubmitted, navigate, toastSuccess, toastError]);

  // ── 8. Loading / error states ─────────────────────────────────────────
  if (loading) return <ExamLoading />;
  if (loadError) return <ExamError message={loadError} onRetry={() => window.location.reload()} />;
  if (!session || !questions.length) {
    return <ExamError message="This exam has no questions yet." onRetry={() => navigate('/participant')} retryLabel="Back to dashboard" />;
  }

  const answer = answers.get(currentQ?.id);
  // Total exam duration in seconds (for ring progress)
  const totalSeconds = session?.endsAt && session?.startedAt
    ? Math.round((new Date(session.endsAt) - new Date(session.startedAt)) / 1000)
    : null;
  // Time spent so far (formatted HH:MM:SS)
  const timeSpentSeconds = totalSeconds && typeof timeLeft === 'number'
    ? Math.max(0, totalSeconds - timeLeft)
    : 0;
  const timeSpentFormatted = formatHMS(timeSpentSeconds);
  const answeredCount = questions.filter(q => hasAnswerForQ(answers.get(q.id))).length;

  // Fullscreen toggle (best-effort)
  const handleFullscreen = () => {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    } catch { /* noop */ }
  };

  return (
    <div className="eq-shell">
      <TopBar
        title={data.quiz?.title}
        onSubmit={() => {
          if (!window.confirm('Submit your exam? You cannot change answers after this.')) return;
          void submitExam();
        }}
        submitting={submitting}
        warningsCount={proctor.warningsCount}
        fullscreenExits={proctor.fullscreenExits}
        onFullscreen={handleFullscreen}
      />

      {/* Page body — 75/25 grid, both columns fill viewport */}
      <div className="eq-page-body mx-auto grid w-full max-w-[1600px] gap-5 px-4 pt-4 pb-4 sm:gap-6 sm:px-6 sm:pt-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 xl:gap-7 xl:px-10 2xl:grid-cols-[minmax(0,1fr)_400px]">

        {/* Left — question card with integrated bottom nav */}
        <main className="flex min-w-0 min-h-0 flex-col">
          <QuestionCard
            question={currentQ}
            index={currentIndex}
            total={total}
            answer={answer}
            disabled={submitting}
            flagged={flagged}
            onToggleFlag={() => toggleFlag(currentQ.id)}
            onChange={(patch) => updateAnswer(currentQ.id, patch)}
            onPrev={() => goTo(currentIndex - 1)}
            onNext={() => goTo(currentIndex + 1)}
            autosaveSeconds={Math.round(AUTOSAVE_MS / 1000)}
          />
        </main>

        {/* Right — sidebar with timer + navigator + live progress + perf chart */}
        <aside className="flex min-h-0 flex-col">
          <QuestionNavigator
            questions={questions}
            answers={answers}
            flagged={flagged}
            currentIndex={currentIndex}
            onJump={goTo}
            timeLeft={timeLeft}
            totalSeconds={totalSeconds}
            onFocusMode={handleFullscreen}
          />
        </aside>
      </div>

      {/* Bottom stats bar */}
      <StatsFooter
        total={total}
        answered={answeredCount}
        remaining={Math.max(0, total - answeredCount)}
        timeSpent={timeSpentFormatted}
        autoSubmit={typeof timeLeft === 'number' ? 'On' : 'Off'}
        examMode={proctor.isActive ? 'Secure' : 'Standard'}
      />
    </div>
  );
}

function formatHMS(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function hasAnswerForQ(a) {
  if (!a) return false;
  return (
    (a.selectedOption !== null && a.selectedOption !== undefined && a.selectedOption !== '') ||
    (typeof a.answerText === 'string' && a.answerText.trim().length > 0)
  );
}

function ExamLoading() {
  return (
    <div className="eq-shell flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200" style={{ borderTopColor: 'var(--eq-accent)' }} />
        <p className="text-sm" style={{ color: 'var(--eq-text-muted)' }}>Loading your exam…</p>
      </div>
    </div>
  );
}

function ExamError({ message, onRetry, retryLabel = 'Reload' }) {
  return (
    <div className="eq-shell flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border bg-white p-6 text-center" style={{ borderColor: '#fee2e2' }}>
        <p className="mb-4 text-sm font-semibold text-rose-700">{message}</p>
        <button
          onClick={onRetry}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--eq-accent)' }}
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
