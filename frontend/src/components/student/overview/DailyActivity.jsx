import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Activity } from 'lucide-react'
import { API_BASE } from '../../../api/api'
import { getAuthHeaders } from '../../../api/request'

/**
 * DailyActivity — small horizontal "GitHub-style" 14-day activity strip.
 * Reads from the existing /api/feed/user/:userId endpoint and bins
 * activities per calendar day client-side.
 */
export default function DailyActivity({ userId }) {
  const [counts, setCounts] = useState({})        // { 'YYYY-MM-DD': number }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!userId) { setLoading(false); return }
      setLoading(true); setError('')
      try {
        const res = await fetch(`${API_BASE}/feed/user/${userId}?limit=200`, {
          headers: getAuthHeaders(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load activity')
        const list = data.data || data.activities || []
        const acc = {}
        list.forEach((a) => {
          const d = new Date(a.createdAt || a.created_at)
          if (isNaN(d.getTime())) return
          const key = d.toISOString().slice(0, 10)
          acc[key] = (acc[key] || 0) + 1
        })
        if (!cancelled) setCounts(acc)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [userId])

  // Build the last 14 days array
  const days = useMemo(() => {
    const arr = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      arr.push({
        key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
        count: counts[key] || 0,
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })
    }
    return arr
  }, [counts])

  const totalActions = days.reduce((s, d) => s + d.count, 0)
  const activeDays = days.filter((d) => d.count > 0).length
  const max = Math.max(1, ...days.map((d) => d.count))

  // Color intensity by count
  const tone = (c) => {
    if (c === 0) return 'var(--academic-bg-soft)'
    const r = c / max
    if (r > 0.66) return 'var(--academic-primary-600)'
    if (r > 0.33) return 'var(--academic-primary-500)'
    return 'var(--academic-primary-200)'
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="ac-card"
    >
      <div className="flex items-center justify-between mb-3" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 className="ac-section-title" style={{ fontSize: 17 }}>Daily learning</h3>
          <p className="ac-section-subtitle">Last 14 days</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="ac-chip ac-chip-primary">
            <Activity size={11} /> {totalActions} actions
          </span>
          <span className="ac-chip">
            <Calendar size={11} /> {activeDays}/14 active
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-between" style={{ gap: 4 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="ac-skeleton" style={{ flex: 1, height: 36, borderRadius: 6 }} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          <div className="flex items-end justify-between" style={{ gap: 6 }}>
            {days.map((d, i) => (
              <motion.div
                key={d.key}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 36, opacity: 1 }}
                transition={{ duration: 0.4, delay: i * 0.025 }}
                title={`${d.dateLabel}: ${d.count} action${d.count === 1 ? '' : 's'}`}
                style={{
                  flex: 1,
                  minWidth: 14,
                  height: 36,
                  borderRadius: 6,
                  background: tone(d.count),
                  border: '1px solid var(--academic-border-soft)',
                  cursor: 'help',
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2" style={{ fontSize: 11, color: 'var(--academic-text-muted)', fontWeight: 600 }}>
            <span>{days[0]?.dateLabel}</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--academic-bg-soft)', border: '1px solid var(--academic-border-soft)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--academic-primary-200)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--academic-primary-500)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--academic-primary-600)' }} />
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--academic-text-muted)', marginTop: 8 }}>
          Activity feed unavailable.
        </p>
      )}
    </motion.section>
  )
}
