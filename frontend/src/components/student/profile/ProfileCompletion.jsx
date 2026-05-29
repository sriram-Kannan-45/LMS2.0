import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * ProfileCompletion — animated circular progress ring.
 * Renders an SVG ring with a smooth dash-offset tween and a count-up percentage.
 *
 * Props:
 *   value        — 0..100
 *   size         — px (default 88)
 *   stroke       — px (default 8)
 *   label        — optional label below the % (default "Complete")
 *   showLabel    — whether to show the small caption inside the ring
 */
export default function ProfileCompletion({
  value = 0,
  size = 88,
  stroke = 8,
  label = 'Complete',
  showLabel = true,
}) {
  const reduced = useReducedMotion()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference

  const [display, setDisplay] = useState(reduced ? clamped : 0)

  useEffect(() => {
    if (reduced) {
      setDisplay(clamped)
      return
    }
    let raf
    const start = performance.now()
    const from = display
    const to = clamped
    const duration = 800

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, reduced])

  const fontSize = Math.max(14, Math.round(size * 0.26))

  return (
    <div className="pf-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="pfRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"  stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="pf-ring__track"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="pf-ring__fill"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduced ? 0 : 1.0, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: `rotate(-90deg)`, transformOrigin: '50% 50%' }}
        />
      </svg>

      <div
        className="pf-ring__pct"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize }}>{display}%</span>
        {showLabel && <span className="pf-ring__label" style={{ marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  )
}
