import { motion } from 'framer-motion'
import { BookOpen, FileText, Sparkles, Zap, ArrowRight, Trophy } from 'lucide-react'

/**
 * ProfileRecentActivity — Rich activity feed (2026-05-28 v4).
 *
 * Real data sources only (no faked events):
 *  - useContinueLearning items: course / lesson / quiz interactions
 *  - stats.breakdownByQuiz: real scores per quiz attempt
 *
 * Row layout:
 *   [icon chip 32]  Title           Right pill
 *                   Sub · timestamp
 */

const TYPE_META = {
  course: {
    icon: BookOpen,
    iconBg: '#eef2ff',
    iconColor: '#4f46e5',
    label: 'Enrolled in course',
    rightLabel: 'Course',
    rightBg: '#eef2ff',
    rightColor: '#4f46e5',
  },
  quiz: {
    icon: Zap,
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    label: 'Took quiz',
    rightLabel: null, // score is shown instead
  },
  lesson: {
    icon: FileText,
    iconBg: '#f5f3ff',
    iconColor: '#7c3aed',
    label: 'Studied lesson',
    rightLabel: 'Lesson',
    rightBg: '#f5f3ff',
    rightColor: '#7c3aed',
  },
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function scoreToneClass(score) {
  if (score >= 80) return 'pf-act__score--ok'
  if (score >= 50) return 'pf-act__score--warn'
  return 'pf-act__score--bad'
}

export default function ProfileRecentActivity({
  items = [],
  stats,
  onResume,
  onTabChange,
  maxItems = 5,
}) {
  const sorted = [...items].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, maxItems)

  // Index quiz scores so quiz rows can show their real result pill
  const scoreById = new Map(
    (stats?.breakdownByQuiz || []).map((q) => [q.quizId, q.bestScore ?? null])
  )

  const empty = sorted.length === 0

  return (
    <section className="pf-act">
      <div className="pf-act__head">
        <div>
          <h3 className="pf-act__title">Recent activity</h3>
          <p className="pf-act__sub">
            {empty ? 'Nothing here yet — start a course or quiz' : 'Your most recent learning steps'}
          </p>
        </div>
        {!empty && onTabChange && (
          <button
            type="button"
            onClick={() => onTabChange('overview')}
            className="pf-act__view-all"
          >
            View all
            <ArrowRight size={13} strokeWidth={2.25} className="pf-act__arrow" aria-hidden />
          </button>
        )}
      </div>

      {empty ? (
        <div className="pf-act__empty">
          <Sparkles size={28} strokeWidth={1.6} aria-hidden />
          <p className="pf-act__empty-text">
            Open a course, lesson, or quiz to see your learning trail here.
          </p>
        </div>
      ) : (
        <div className="pf-act__list">
          {sorted.map((item, i) => {
            const meta = TYPE_META[item.type] || TYPE_META.course
            const Icon = meta.icon
            const score = item.type === 'quiz' ? scoreById.get(item.id) : null

            return (
              <motion.button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => onResume?.(item)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="pf-act__row"
              >
                <span
                  className="pf-act__icon-chip"
                  style={{ background: meta.iconBg, color: meta.iconColor }}
                  aria-hidden
                >
                  <Icon size={16} strokeWidth={2.25} />
                </span>

                <div className="pf-act__body">
                  <span className="pf-act__row-title">
                    {meta.label}: <strong>{item.title || '—'}</strong>
                  </span>
                  <span className="pf-act__row-sub">
                    {item.subtitle ? `${item.subtitle} · ` : ''}{timeAgo(item.ts)}
                  </span>
                </div>

                {/* Right side: score for quiz, label tag otherwise */}
                {item.type === 'quiz' && typeof score === 'number' ? (
                  <span className={`pf-act__score mono ${scoreToneClass(score)}`}>
                    {score.toFixed(0)}%
                  </span>
                ) : meta.rightLabel ? (
                  <span
                    className="pf-act__tag"
                    style={{
                      background: meta.rightBg,
                      color: meta.rightColor,
                    }}
                  >
                    {meta.rightLabel}
                  </span>
                ) : null}
              </motion.button>
            )
          })}
        </div>
      )}
    </section>
  )
}
