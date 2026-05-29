import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Target, Zap, Award, ArrowUpRight, ArrowDownRight, Minus, ArrowRight } from 'lucide-react'

/* ───── Count-up helper ────────────────────────────────────────────────── */
function useCountUp(target, duration = 700, decimals = 0) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)
  const fromRef = useRef(0)
  const lastTarget = useRef(target)

  useEffect(() => {
    if (reduced) { setValue(target); fromRef.current = target; lastTarget.current = target; return }
    if (target === lastTarget.current && fromRef.current === target) return
    const start = performance.now()
    const from = fromRef.current
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (target - from) * eased
      setValue(decimals ? +next.toFixed(decimals) : Math.round(next))
      if (t < 1) raf = requestAnimationFrame(tick)
      else { fromRef.current = target; lastTarget.current = target }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, decimals, reduced])

  return value
}

/* ───── Single tile ────────────────────────────────────────────────────── */
function StatTile({
  icon: Icon, label, value, suffix = '', helper, delta, delay = 0, tone, footer,
}) {
  const TONE_MAP = {
    indigo:  { bg: '#eef2ff', color: '#4f46e5' },
    emerald: { bg: '#ecfdf5', color: '#059669' },
    amber:   { bg: '#fffbeb', color: '#d97706' },
    purple:  { bg: '#f5f3ff', color: '#7c3aed' },
  }
  const t = TONE_MAP[tone] || TONE_MAP.indigo
  const counted = useCountUp(typeof value === 'number' ? value : 0, 700, suffix === '%' ? 1 : 0)
  const isNumeric = typeof value === 'number'
  const display = isNumeric
    ? (suffix === '%' ? counted.toFixed(1) : Math.round(counted).toLocaleString())
    : (value ?? '—')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className="pf-stat"
    >
      <div className="pf-stat__top">
        <span
          className="pf-stat__chip"
          style={{ background: t.bg, color: t.color }}
          aria-hidden
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="pf-stat__label">{label}</span>
      </div>

      <div className="pf-stat__value mono">
        {display}
        {isNumeric && suffix && <span className="pf-stat__suffix">{suffix}</span>}
      </div>

      <div className="pf-stat__divider" aria-hidden />

      <div className="pf-stat__bottom">
        {typeof delta === 'number' && (
          <span
            className="pf-stat__delta"
            data-direction={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}
          >
            {delta > 0 ? <ArrowUpRight size={12} strokeWidth={2.25} aria-hidden />
              : delta < 0 ? <ArrowDownRight size={12} strokeWidth={2.25} aria-hidden />
              : <Minus size={12} strokeWidth={2.25} aria-hidden />}
            <span>{delta > 0 ? '+' : ''}{delta}{suffix === '%' ? '%' : ''}</span>
          </span>
        )}
        {helper && <span className="pf-stat__helper">{helper}</span>}
      </div>

      {footer && <div className="pf-stat__footer">{footer}</div>}
    </motion.div>
  )
}

/* ───── Mini XP progress bar (footer for XP card) ─────────────────────── */
function XPProgress({ xp }) {
  // Simple level system: 100 XP per level
  const level = Math.floor(xp / 100) + 1
  const within = xp % 100
  const pctRaw = Math.min(100, Math.max(0, (within / 100) * 100))

  return (
    <>
      <div className="pf-stat__xp-bar" aria-hidden>
        <motion.div
          className="pf-stat__xp-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pctRaw}%` }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="pf-stat__xp-label mono">
        {within} / 100 XP to Level {level + 1}
      </span>
    </>
  )
}

/* ───── Certificates hint chip ────────────────────────────────────────── */
function CertificatesHint({ onTabChange }) {
  if (!onTabChange) return null
  return (
    <button
      type="button"
      onClick={() => onTabChange('ai-quizzes')}
      className="pf-stat__hint-chip"
    >
      Next: Score 70% on any quiz
      <ArrowRight size={11} strokeWidth={2.25} aria-hidden />
    </button>
  )
}

/* ───── Public component ───────────────────────────────────────────────── */
export default function ProfileMiniStats({
  totalQuizzes = 0,
  accuracy = 0,
  xp = 0,
  certificates = 0,
  accuracyDelta,
  onTabChange,
}) {
  return (
    <>
      <StatTile
        icon={BookOpen}
        label="Total quizzes"
        value={totalQuizzes}
        helper={totalQuizzes ? 'attempts logged' : 'no attempts yet'}
        tone="indigo"
        delay={0.0}
      />
      <StatTile
        icon={Target}
        label="Accuracy"
        value={accuracy}
        suffix="%"
        helper={typeof accuracyDelta === 'number' ? null : 'across all quizzes'}
        delta={accuracyDelta}
        tone="emerald"
        delay={0.05}
      />
      <StatTile
        icon={Zap}
        label="XP points"
        value={xp}
        helper="earn 10 XP per attempt"
        tone="amber"
        delay={0.10}
        footer={<XPProgress xp={xp} />}
      />
      <StatTile
        icon={Award}
        label="Certificates"
        value={certificates}
        helper={certificates > 0 ? 'earned so far' : 'score 70%+ to earn'}
        tone="purple"
        delay={0.15}
        footer={certificates === 0 ? <CertificatesHint onTabChange={onTabChange} /> : null}
      />
    </>
  )
}
