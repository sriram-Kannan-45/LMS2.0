import { motion } from 'framer-motion'
import { Crown, Clock, Target } from 'lucide-react'

const initials = (name) =>
  name ? name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?'

const fmtTime = (sec) => {
  if (sec == null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const PODIUM = {
  1: {
    label: '1st place',
    short: '1st',
    avatarGradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    plateGradient:  'linear-gradient(180deg, rgba(251,191,36,0.18), rgba(245,158,11,0.06))',
    plateBorder:    'rgba(245,158,11,0.30)',
    glow:           '0 0 0 4px rgba(251,191,36,0.18), 0 18px 36px -8px rgba(245,158,11,0.40)',
    accentColor:    '#92400e',
    accentBg:       'rgba(245,158,11,0.10)',
    plateHeight:    160,
    avatarSize:     84,
    fontSize:       30,
    crown: true,
  },
  2: {
    label: '2nd place',
    short: '2nd',
    avatarGradient: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
    plateGradient:  'linear-gradient(180deg, rgba(148,163,184,0.16), rgba(100,116,139,0.05))',
    plateBorder:    'rgba(148,163,184,0.30)',
    glow:           '0 0 0 4px rgba(148,163,184,0.18), 0 14px 30px -8px rgba(100,116,139,0.30)',
    accentColor:    '#475569',
    accentBg:       'rgba(148,163,184,0.10)',
    plateHeight:    130,
    avatarSize:     72,
    fontSize:       24,
    crown: false,
  },
  3: {
    label: '3rd place',
    short: '3rd',
    avatarGradient: 'linear-gradient(135deg, #fdba74 0%, #ea580c 100%)',
    plateGradient:  'linear-gradient(180deg, rgba(251,146,60,0.16), rgba(234,88,12,0.05))',
    plateBorder:    'rgba(251,146,60,0.30)',
    glow:           '0 0 0 4px rgba(251,146,60,0.18), 0 14px 30px -8px rgba(234,88,12,0.30)',
    accentColor:    '#9a3412',
    accentBg:       'rgba(234,88,12,0.10)',
    plateHeight:    110,
    avatarSize:     72,
    fontSize:       24,
    crown: false,
  },
}

function PodiumCard({ entry, rank, delay }) {
  if (!entry) return <div className="lb-podium-card" style={{ opacity: 0 }} aria-hidden />
  const cfg = PODIUM[rank]
  const isYou = entry.isCurrentUser

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 22 }}
      className="lb-podium-card"
    >
      {/* Crown for 1st */}
      {cfg.crown && (
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="lb-podium-card__crown"
          aria-hidden
        >
          <Crown size={26} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1.6} />
        </motion.div>
      )}

      {/* Avatar with glow ring */}
      <div className="lb-podium-card__avatar-wrap">
        {isYou && (
          <span className="lb-podium-card__you-pill">YOU</span>
        )}
        <div
          className="lb-podium-card__avatar"
          style={{
            width: cfg.avatarSize,
            height: cfg.avatarSize,
            fontSize: cfg.fontSize * 0.45,
            background: cfg.avatarGradient,
            boxShadow: cfg.glow,
          }}
          aria-label={`Rank ${rank} ${entry.name}`}
        >
          {initials(entry.name)}
        </div>
        {/* Rank chip floating bottom-right of avatar */}
        <span
          className="lb-podium-card__rank-chip"
          style={{
            background: cfg.avatarGradient,
            color: '#fff',
          }}
        >
          {rank}
        </span>
      </div>

      {/* Name */}
      <h4 className="lb-podium-card__name" title={entry.name}>
        {entry.name}
      </h4>

      {/* Score — prominent */}
      <div
        className="lb-podium-card__score"
        style={{ color: cfg.accentColor }}
      >
        {entry.score?.toFixed(1)}
        <span className="lb-podium-card__score-pct">%</span>
      </div>

      {/* Inline meta */}
      <div className="lb-podium-card__meta">
        <span className="lb-podium-card__meta-item">
          <Target size={11} strokeWidth={2.25} aria-hidden />
          {entry.accuracy != null ? `${entry.accuracy.toFixed(0)}%` : '—'}
        </span>
        <span className="lb-podium-card__meta-dot" aria-hidden>·</span>
        <span className="lb-podium-card__meta-item">
          <Clock size={11} strokeWidth={2.25} aria-hidden />
          {fmtTime(entry.timeTaken)}
        </span>
      </div>

      {/* Pedestal plate */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: cfg.plateHeight, opacity: 1 }}
        transition={{ delay: delay + 0.18, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="lb-podium-card__plate"
        style={{
          background: cfg.plateGradient,
          borderColor: cfg.plateBorder,
        }}
      >
        <span
          className="lb-podium-card__plate-label"
          style={{ color: cfg.accentColor, background: cfg.accentBg }}
        >
          {cfg.short.toUpperCase()}
        </span>
      </motion.div>
    </motion.div>
  )
}

/**
 * PodiumTop3 — gold / silver / bronze stage. Display order: 2nd · 1st · 3rd.
 */
export default function PodiumTop3({ entries = [] }) {
  const order = [entries[1], entries[0], entries[2]]
  const ranks = [2, 1, 3]
  return (
    <div className="lb-podium-grid">
      {order.map((e, i) => (
        <PodiumCard key={ranks[i]} entry={e} rank={ranks[i]} delay={i * 0.1 + 0.05} />
      ))}
    </div>
  )
}
