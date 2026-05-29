import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Trophy, ArrowRight, Crown } from 'lucide-react'
import { useLeaderboard } from '../../../hooks/useLeaderboard'

const initials = (name) =>
  name ? name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?'

/**
 * ProfileLeaderboardBadge — Full leaderboard snapshot card (v4).
 *
 * Live data via useLeaderboard. Includes:
 *   - Hero rank + "of N participants"
 *   - 4 stat rows: Best Score, Average, Percentile, Gap to #1
 *     (or Status: Leader 👑 when rank=1)
 *   - Mini podium visual (2-1-3 layout, gold/silver/bronze)
 *   - View full leaderboard footer link
 */
export default function ProfileLeaderboardBadge({
  user,
  rank,
  bestScore,
  averageScore,
  onViewFull,
}) {
  const { entries } = useLeaderboard({ scope: 'global', live: true })

  const myEntry = useMemo(
    () => entries.find((e) => e.isCurrentUser || e.userId === user?.id),
    [entries, user?.id]
  )

  const totalParticipants = entries.length
  const liveRank = myEntry?.rank ?? rank
  const liveBest = myEntry?.score ?? bestScore
  const hasRank = Number.isFinite(liveRank) && liveRank > 0

  const tier = !hasRank
    ? null
    : liveRank === 1 ? 'Champion'
      : liveRank <= 3 ? 'Podium'
        : liveRank <= 10 ? 'Top 10'
          : 'On the board'

  const percentile =
    hasRank && totalParticipants > 0
      ? Math.round(((totalParticipants - liveRank + 1) / totalParticipants) * 100)
      : null

  const leaderScore = entries[0]?.score
  const gap =
    hasRank && liveRank > 1 && Number.isFinite(leaderScore) && Number.isFinite(liveBest)
      ? Math.max(0, +(leaderScore - liveBest).toFixed(1))
      : null

  const top3 = entries.slice(0, 3)

  if (!hasRank) {
    return (
      <section className="pf-rank">
        <div className="pf-rank__head">
          <div className="pf-rank__title-block">
            <h3 className="pf-rank__title">Leaderboard</h3>
            <p className="pf-rank__sub">Take a quiz to climb the ranks</p>
          </div>
        </div>
        <div className="pf-rank__empty">
          <Trophy size={28} strokeWidth={1.6} aria-hidden />
          <p>You haven't ranked yet — complete a quiz to get started.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="pf-rank">
      <div className="pf-rank__head">
        <div className="pf-rank__title-block">
          <h3 className="pf-rank__title">Leaderboard</h3>
          <p className="pf-rank__sub">Your best position across all quizzes</p>
        </div>
        <span className="pf-rank__tier">
          <Trophy size={12} strokeWidth={2.25} aria-hidden /> {tier}
        </span>
      </div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pf-rank__hero mono"
      >
        #{liveRank}
      </motion.div>
      {totalParticipants > 0 && (
        <p className="pf-rank__hero-sub">
          of <span className="mono">{totalParticipants}</span> participant{totalParticipants === 1 ? '' : 's'}
        </p>
      )}

      <div className="pf-rank__stats">
        <div className="pf-rank__row">
          <span className="pf-rank__label">Best Score</span>
          <span className="pf-rank__value pf-rank__value--green mono">
            {Number.isFinite(liveBest) ? `${liveBest.toFixed(1)}%` : '—'}
          </span>
        </div>
        <div className="pf-rank__row">
          <span className="pf-rank__label">Average</span>
          <span className="pf-rank__value pf-rank__value--brand mono">
            {Number.isFinite(averageScore) ? `${averageScore.toFixed(1)}%` : '—'}
          </span>
        </div>
        {percentile != null && (
          <div className="pf-rank__row">
            <span className="pf-rank__label">Percentile</span>
            <span className="pf-rank__value pf-rank__value--ink mono">
              {percentile}<span className="pf-rank__th">th</span>
            </span>
          </div>
        )}
        {gap != null && (
          <div className="pf-rank__row">
            <span className="pf-rank__label">Gap to #1</span>
            <span className="pf-rank__value pf-rank__value--red mono">
              ~{gap}%
            </span>
          </div>
        )}
        {liveRank === 1 && (
          <div className="pf-rank__row">
            <span className="pf-rank__label">Status</span>
            <span className="pf-rank__value pf-rank__value--gold mono">
              <Crown size={13} strokeWidth={2.2} fill="#fbbf24" stroke="#f59e0b" /> Leader
            </span>
          </div>
        )}
      </div>

      {/* Mini podium */}
      {top3.length > 0 && (
        <div className="pf-rank__podium" aria-label="Top performers">
          {[
            top3[1] && { e: top3[1], rank: 2, cls: 'silver' },
            top3[0] && { e: top3[0], rank: 1, cls: 'gold' },
            top3[2] && { e: top3[2], rank: 3, cls: 'bronze' },
          ].filter(Boolean).map(({ e, rank: r, cls }) => (
            <div key={r} className={`pf-rank__podium-slot pf-rank__podium-slot--${cls}`}>
              <div className={`pf-rank__podium-avatar pf-rank__podium-avatar--${cls}`}>
                {initials(e.name)}
                {r === 1 && (
                  <span className="pf-rank__podium-crown" aria-hidden>
                    <Crown size={11} strokeWidth={2.2} fill="#fbbf24" stroke="#f59e0b" />
                  </span>
                )}
                {(e.isCurrentUser || e.userId === user?.id) && (
                  <span className="pf-rank__podium-you">YOU</span>
                )}
              </div>
              <span className={`pf-rank__podium-rank pf-rank__podium-rank--${cls} mono`}>#{r}</span>
              <span className="pf-rank__podium-name" title={e.name}>{e.name}</span>
            </div>
          ))}
        </div>
      )}

      {onViewFull && (
        <button type="button" onClick={onViewFull} className="pf-rank__link">
          View full leaderboard
          <ArrowRight size={13} strokeWidth={2.25} className="pf-rank__link-arrow" aria-hidden />
        </button>
      )}
    </section>
  )
}
