/**
 * QuizCard — premium SaaS card (2026-05-28 redesign).
 *
 * Inspired by Linear / Notion / Stripe / Vercel / Framer dashboards.
 * Minimal, spacious, strong typographic hierarchy, no decorative icons.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │                              [AI]  [Hard]    │  ← right-aligned pills only
 *   │                                              │
 *   │  Quiz title — 2 lines, prominent             │
 *   │                                              │
 *   │  10 questions  ·  30 min                     │  ← inline meta, dot separator
 *   │                                              │
 *   │  YOUR PROGRESS                       42%     │
 *   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
 *   │                                              │
 *   │  [  Start quiz  →  ]                         │  ← gradient CTA, glow on hover
 *   └──────────────────────────────────────────────┘
 */
import { motion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

const DIFFICULTY = {
  HARD:   { label: 'Hard',   bg: '#fef2f2', border: '#fecdd3', text: '#be123c' },
  MEDIUM: { label: 'Medium', bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  EASY:   { label: 'Easy',   bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
  MIXED:  { label: 'Mixed',  bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
};

function getDiff(level) {
  const k = (level || 'MEDIUM').toUpperCase();
  return DIFFICULTY[k] || DIFFICULTY.MEDIUM;
}

const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function QuizCard({ quiz, index, onStart, isStarting }) {
  const diff = getDiff(quiz.difficulty);
  const questionCount = quiz.questionCount ?? quiz.questions?.length ?? 0;
  const timeLimit = quiz.timeLimit || 30;
  const completion = Math.min(100, Math.max(0, Math.round(quiz.completionPercent ?? 0)));
  const isCompleted = completion >= 100;
  const isAI = quiz.isAI ?? quiz.aiGenerated ?? true;

  return (
    <motion.article
      variants={cardVariants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="qz-card group relative flex h-full flex-col"
    >
      {/* ── Top row — pill cluster (top-right only, no left icon) ── */}
      <div className="qz-card__pills">
        {isAI && (
          <span className="qz-pill qz-pill--ai">AI</span>
        )}
        <span
          className="qz-pill"
          style={{
            background: diff.bg,
            borderColor: diff.border,
            color: diff.text,
          }}
        >
          {diff.label}
        </span>
      </div>

      {/* ── Title ── */}
      <h3 className="qz-card__title clamp-2" title={quiz.title}>
        {quiz.title}
      </h3>

      {/* ── Inline meta with dot separator ── */}
      <div className="qz-card__meta">
        <span>{questionCount} {questionCount === 1 ? 'question' : 'questions'}</span>
        <span className="qz-card__dot" aria-hidden>·</span>
        <span>{timeLimit} min</span>
      </div>

      {/* ── Progress section ── */}
      <div className="qz-card__progress">
        <div className="qz-card__progress-row">
          <span className="qz-card__progress-label">Your progress</span>
          <span
            className="qz-card__progress-value mono"
            data-active={completion > 0 ? 'true' : 'false'}
            data-done={isCompleted ? 'true' : 'false'}
          >
            {completion}%
          </span>
        </div>
        <div className="qz-card__progress-track">
          <motion.div
            className="qz-card__progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.9, delay: index * 0.04 + 0.15, ease: [0.16, 1, 0.3, 1] }}
            data-done={isCompleted ? 'true' : 'false'}
          />
        </div>
      </div>

      {/* ── CTA ── */}
      <button
        type="button"
        onClick={() => !isStarting && onStart(quiz)}
        disabled={isStarting}
        className="qz-card__cta"
        data-done={isCompleted ? 'true' : 'false'}
        data-loading={isStarting ? 'true' : 'false'}
      >
        <span className="qz-card__cta-label">
          {isStarting ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden />
              Starting…
            </>
          ) : isCompleted ? (
            <>
              <Check size={15} strokeWidth={2.5} aria-hidden />
              Retake quiz
            </>
          ) : (
            <>
              Start quiz
              <ArrowRight size={15} strokeWidth={2.25} className="qz-card__cta-arrow" aria-hidden />
            </>
          )}
        </span>
      </button>
    </motion.article>
  );
}
