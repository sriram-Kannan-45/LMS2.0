import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp } from 'lucide-react'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{
      background: 'var(--academic-surface)',
      border: '1px solid var(--academic-border)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: 'var(--academic-shadow-card)',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--academic-text)', marginBottom: 2 }}>
        {p.quizTitle}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--academic-text-muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--academic-primary-700)' }}>
        {p.score.toFixed(1)}%
      </div>
    </div>
  )
}

/**
 * AccuracyTrendChart — area-line chart of recent quiz scores.
 * Receives the `accuracyTrend` array from useStudentStats.
 */
export default function AccuracyTrendChart({ data = [], loading = false }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="ac-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="ac-section-title" style={{ fontSize: 17 }}>Accuracy trend</h3>
          <p className="ac-section-subtitle">Last {data.length || 0} attempts</p>
        </div>
        <span className="ac-chip ac-chip-primary">
          <TrendingUp size={11} /> Performance
        </span>
      </div>

      {loading && (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="ac-skeleton" style={{ width: '100%', height: 200 }} />
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="ac-empty" style={{ padding: '40px 20px' }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No attempts yet</h4>
          <p style={{ fontSize: 13, color: 'var(--academic-text-muted)' }}>
            Take a quiz to start building your trend.
          </p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="ac-trend-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--academic-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(d) => {
                  if (!d) return ''
                  const dt = new Date(d)
                  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--academic-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 2 }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#ac-trend-gradient)"
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.section>
  )
}
