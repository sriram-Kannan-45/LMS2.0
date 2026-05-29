/**
 * ParticipantProctoredQuiz — gate for /participant/exam/:quizId.
 *
 * Receives attemptId + quizData from React Router state (set by the
 * dashboard when the user clicks Start). Runs the readiness checklist,
 * then on session activation navigates to /exam/:sessionId where the
 * actual exam UI lives.
 *
 * Auth-guarded: redirects to /login if no user.id.
 *
 * NOTE: All hooks must run on every render (React rules of hooks).
 * Do not place useEffect / useCallback after early returns.
 */
import { useCallback, useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

import { ProctorProvider } from '../proctoring';
import useAuthUser from '../proctoring/hooks/useAuthUser';
import ExamGate from '../proctoring/components/ExamGate';

export default function ParticipantProctoredQuiz() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, ready } = useAuthUser();

  const handleReady = useCallback((session) => {
    if (session?.sessionId) {
      navigate(`/exam/${session.sessionId}`, { replace: true });
    }
  }, [navigate]);

  // If we don't have the attempt + quizData in router state, the user
  // probably refreshed or hit the URL directly. Send them back to the
  // quizzes list so the existing /api/ai-quiz/participant/start flow
  // can run first.
  useEffect(() => {
    if (ready && !state?.attemptId) {
      navigate('/participant', { replace: true });
    }
  }, [ready, state?.attemptId, navigate]);

  // ── Render guards (no hooks below this point) ───────────────────────────
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }
  if (!user?.id) return <Navigate to="/login" replace />;
  if (!state?.attemptId) return null; // useEffect above will navigate away

  return (
    <ProctorProvider>
      <ExamGate
        quizId={Number(quizId)}
        quizTitle={state?.quizData?.title}
        attemptId={state.attemptId}
        onCancel={() => navigate('/participant', { replace: true })}
        onReady={handleReady}
      />
    </ProctorProvider>
  );
}
