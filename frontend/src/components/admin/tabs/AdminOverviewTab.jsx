import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Sparkles, BookOpen, Users, UserCheck, Activity, MessageSquare, Star, Award, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { SkeletonStats } from '../../Skeleton'

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    if (target == null || isNaN(target)) { setValue(0); return }
    const start = performance.now()
    const from = fromRef.current
    let raf
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(step)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

const ICONS = {
  trainings: BookOpen, trainers: Users, participants: UserCheck,
  enrollments: Activity, feedbacks: MessageSquare, rating: Star,
  topTrainer: Award, satisfaction: TrendingUp,
}

const STAT_COLORS = [
  { bg: 'var(--academic-primary-50)', color: 'var(--academic-primary-600)' },
  { bg: 'var(--academic-secondary-50)', color: 'var(--academic-secondary-600)' },
  { bg: 'var(--academic-accent-50)', color: 'var(--academic-accent-500)' },
  { bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  { bg: 'var(--academic-primary-100)', color: 'var(--academic-primary-700)' },
  { bg: 'rgba(236,72,153,0.08)', color: '#db2777' },
  { bg: 'rgba(251,146,60,0.08)', color: '#ea580c' },
  { bg: 'rgba(34,211,238,0.08)', color: '#0891b2' },
]

function StatCard({ Icon, label, value, color, delay = 0 }) {
  const numVal = typeof value === 'number' ? value : parseFloat(value) || 0
  const counted = useCountUp(numVal)
  const display = typeof value === 'number' ? Math.round(counted).toLocaleString() : value

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="ov-stat"
    >
      <div className="ov-stat__head">
        <span className="ov-stat__label">{label}</span>
        <span className="ov-stat__icon" aria-hidden style={{ background: color?.bg, color: color?.color }}>
          <Icon size={14} strokeWidth={2} />
        </span>
      </div>
      <div className="ov-stat__value mono">{display}</div>
    </motion.div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--academic-surface)', border: '1px solid var(--academic-border)',
      borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--academic-shadow-card)', fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--academic-text)', marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

const getTimeGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminOverviewTab({ user, stats, feedbacks, initialLoading, loading }) {
  const greeting = getTimeGreeting()
  const firstName = user?.name?.split(' ')[0] || 'Admin'

  // Compute chart data
  const trainingGroups = {}
  feedbacks.forEach(f => {
    if (!trainingGroups[f.trainingTitle]) {
      trainingGroups[f.trainingTitle] = { tr: 0, sr: 0, count: 0 }
    }
    trainingGroups[f.trainingTitle].tr += f.trainerRating
    trainingGroups[f.trainingTitle].sr += f.subjectRating
    trainingGroups[f.trainingTitle].count++
  })
  const chartData = Object.entries(trainingGroups).map(([title, d]) => ({
    name: title,
    'Avg Trainer Rating': +(d.tr / d.count).toFixed(1),
    'Avg Subject Rating': +(d.sr / d.count).toFixed(1),
  }))

  // Top trainer
  const trStats = {}
  feedbacks.forEach(f => {
    if (!f.trainerName) return
    if (!trStats[f.trainerName]) trStats[f.trainerName] = { score: 0, count: 0 }
    trStats[f.trainerName].score += f.trainerRating
    trStats[f.trainerName].count++
  })
  let topTrainerName = '-'
  let topAvg = 0
  Object.entries(trStats).forEach(([name, d]) => {
    const avg = d.score / d.count
    if (avg > topAvg) { topTrainerName = name; topAvg = avg }
  })

  const statItems = [
    { label: 'Total Trainings', value: stats.totalTrainings ?? 0, key: 'trainings' },
    { label: 'Trainers', value: stats.totalTrainers ?? 0, key: 'trainers' },
    { label: 'Participants', value: stats.totalParticipants ?? 0, key: 'participants' },
    { label: 'Active Enrollments', value: stats.totalEnrollments ?? 0, key: 'enrollments' },
    { label: 'Feedback Responses', value: stats.totalFeedbacks ?? 0, key: 'feedbacks' },
    { label: 'Avg Trainer Rating', value: `${stats.avgTrainerRating ?? '0.0'}`, key: 'rating' },
    { label: 'Top Trainer', value: topTrainerName, key: 'topTrainer' },
    { label: 'Satisfaction Score', value: `${stats.satisfactionScore ?? '0.0'}`, key: 'satisfaction' },
  ]

  return (
    <div className="ov-shell">
      {/* Welcome Banner */}
      <motion.section
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="ov-hero"
      >
        <span className="ov-hero__bloom" aria-hidden />
        <div className="ov-hero__inner">
          <div className="ov-hero__left">
            <span className="ov-hero__kicker">
              <Sparkles size={12} aria-hidden /> {greeting}
            </span>
            <h1 className="ov-hero__title">
              Welcome back, <span className="ov-hero__title-name">{firstName}</span>
            </h1>
            <p className="ov-hero__subtitle">
              Here&apos;s what&apos;s happening across your platform today.
            </p>
          </div>
          <div className="ov-hero__right">
            <div className="ov-hero__avatar" aria-hidden>
              {user?.name ? user.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stat Cards */}
      {initialLoading ? (
        <SkeletonStats />
      ) : (
        <div className="ov-stat-grid">
          {statItems.map((s, i) => (
            <StatCard
              key={s.key}
              Icon={ICONS[s.key]}
              label={s.label}
              value={s.value}
              color={STAT_COLORS[i]}
              delay={i * 0.04}
            />
          ))}
        </div>
      )}

      {/* Feedback Chart */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="ac-card"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="ac-section-title" style={{ fontSize: 17 }}>Feedback Trends</h3>
            <p className="ac-section-subtitle">
              {feedbacks.length > 0 ? `${feedbacks.length} feedback records` : 'No feedback yet'}
            </p>
          </div>
          <span className="ac-chip ac-chip-violet" style={{ flexShrink: 0 }}>
            <TrendingUp size={11} /> Performance
          </span>
        </div>

        {feedbacks.length > 0 && chartData.length > 0 ? (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--academic-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--academic-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.04)' }} />
                <Bar dataKey="Avg Trainer Rating" fill="var(--academic-primary-500)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Avg Subject Rating" fill="var(--academic-secondary-500)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="ac-empty" style={{ padding: '40px 20px' }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No feedback yet</h4>
            <p style={{ fontSize: 13, color: 'var(--academic-text-muted)' }}>
              Feedback trends will appear once participants start submitting feedback.
            </p>
          </div>
        )}
      </motion.section>
    </div>
  )
}
