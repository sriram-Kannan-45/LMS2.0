import { motion } from 'framer-motion'
import { ArrowRight, Lock, Check } from 'lucide-react'
import { buildBadgeCatalogue } from '../achievements/BadgeGrid'

const TONE_STYLES = {
  primary: { bg: '#eef2ff', color: '#4f46e5' },
  teal:    { bg: '#ecfdf5', color: '#059669' },
  violet:  { bg: '#f5f3ff', color: '#7c3aed' },
  warning: { bg: '#fffbeb', color: '#d97706' },
  danger:  { bg: '#fef2f2', color: '#dc2626' },
}

/**
 * ProfileAchievementsPreview — compact badge dashboard widget (2026-05-28 v4).
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Achievements              See all →                      │
 *   │ 3 of 11 earned                                           │
 *   │ ▰▰▰▱▱▱▱▱▱▱▱  27%                                         │
 *   │                                                          │
 *   │  [✓ B1]  [✓ B2]  [✓ B3]  [🔒 B4]  [🔒 B5]                 │
 *   │                                                          │
 *   │ View all 11 badges →                                     │
 *   └──────────────────────────────────────────────────────────┘
 */
export default function ProfileAchievementsPreview({
  stats,
  enrollmentsCount = 0,
  streak = 0,
  onSeeAll,
}) {
  const badges = buildBadgeCatalogue({ stats, enrollmentsCount, streak })
  const earned = badges.filter((b) => b.earned)
  const locked = badges.filter((b) => !b.earned)
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))

  const total = badges.length
  const earnedCount = earned.length
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0

  // Show all earned + 2-3 closest-to-unlock locked
  const lockedToShow = locked.slice(0, Math.max(0, 5 - earnedCount))
  const visibleBadges = [...earned, ...lockedToShow]

  return (
    <section className="pf-ach-preview">
      <div className="pf-ach-preview__head">
        <div className="pf-ach-preview__title-block">
          <h3 className="pf-ach-preview__title">Achievements</h3>
          <p className="pf-ach-preview__sub">
            <span className="mono">{earnedCount}</span> of <span className="mono">{total}</span> earned
          </p>
        </div>
        {onSeeAll && (
          <button type="button" onClick={onSeeAll} className="pf-ach-preview__see-all">
            See all
            <ArrowRight size={13} strokeWidth={2.25} className="pf-ach-preview__arrow" aria-hidden />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="pf-ach-preview__bar" aria-hidden>
        <motion.div
          className="pf-ach-preview__fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Compact badge grid */}
      <div className="pf-ach-preview__grid">
        {visibleBadges.map((b, i) => {
          const tone = TONE_STYLES[b.tone] || TONE_STYLES.primary
          const Icon = b.icon
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
              className="pf-ach-tile"
              data-state={b.earned ? 'earned' : 'locked'}
              title={`${b.label} — ${b.description}`}
            >
              <div className="pf-ach-tile__icon-wrap">
                <span
                  className="pf-ach-tile__icon"
                  style={b.earned
                    ? { background: tone.bg, color: tone.color }
                    : { background: '#f1f0f5', color: '#aeaeb5' }}
                >
                  {b.earned ? <Icon size={18} strokeWidth={2} aria-hidden /> : <Lock size={16} strokeWidth={2} aria-hidden />}
                </span>
                {b.earned && (
                  <span className="pf-ach-tile__check" aria-hidden>
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className="pf-ach-tile__name">{b.label}</span>
              {!b.earned && b.progress > 0 && (
                <div className="pf-ach-tile__mini-bar" aria-hidden>
                  <div
                    className="pf-ach-tile__mini-fill"
                    style={{ width: `${Math.round(b.progress * 100)}%` }}
                  />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {onSeeAll && (
        <button type="button" onClick={onSeeAll} className="pf-ach-preview__footer-link">
          View all {total} badges
          <ArrowRight size={13} strokeWidth={2.25} className="pf-ach-preview__arrow" aria-hidden />
        </button>
      )}
    </section>
  )
}
