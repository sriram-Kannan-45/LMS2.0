import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Users, Star, FileText, CheckCircle, Clock, MessageSquare,
  TrendingUp, BookOpen, Award, BarChart3, ArrowRight, Activity
} from 'lucide-react'
import NotesSection from '../components/trainer/notes/NotesSection'
import ParticipantProfileView from '../components/shared/ParticipantProfileView'
import TrainerCourses from './TrainerCourses'
import { useToast } from '../components/Toast'
import Pagination from '../components/Pagination'
import { Button, Badge, EmptyState, StatCard, ProgressBar } from '../components/ui'
import { API_BASE } from '../api/api'

const API = API_BASE

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
}

function TrainerDashboard({ user, onLogout, activeTab, onTabChange }) {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const tab = activeTab === 'trainings' ? 'courses' : (activeTab || 'overview')
  const [trainings, setTrainings] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [stats, setStats] = useState({
    totalTrainings: 0, avgTrainerRating: 0, totalFeedbacks: 0,
    totalLearners: 0, publishedCourses: 0,
  })
  const [feedbackPage, setFeedbackPage] = useState(1)
  const feedbackItemsPerPage = 5
  const [recentActivity, setRecentActivity] = useState([])
  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [viewingParticipant, setViewingParticipant] = useState(null)
  const [trainerReport, setTrainerReport] = useState(null)

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  const fetchTrainerReport = async () => {
    try {
      const r = await fetch(`${API}/reports/trainer`, { headers: auth() })
      const d = await r.json()
      if (r.ok && d.success) setTrainerReport(d.data)
    } catch (e) { console.error('fetchTrainerReport error:', e.message) }
  }

  const handleRegenerateCertificate = async () => {
    try {
      const r = await fetch(`${API}/trainer/certificates/regenerate`, { method: 'POST', headers: auth() })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      success('Certificate check/regeneration triggered!')
      fetchTrainerReport()
    } catch (e) { showError(e.message) }
  }

  useEffect(() => {
    fetchTrainings()
    fetchFeedbacks()
  }, [])

  useEffect(() => {
    if (tab === 'reports') fetchTrainerReport()
  }, [tab])

  const fetchTrainings = async () => {
    try {
      const r = await fetch(`${API}/trainer/trainings`, { headers: auth() })
      const d = await r.json()
      const list = d.trainings || []
      setTrainings(list)
      const published = list.filter(t => t.status === 'PUBLISHED').length
      const totalLearners = list.reduce((sum, t) => sum + (t.enrolledCount || t.participantCount || 0), 0)
      setStats(p => ({ ...p, totalTrainings: list.length, publishedCourses: published, totalLearners }))
      const activities = list.slice(0, 8).map((t, i) => ({
        id: i, type: 'course', icon: BookOpen,
        color: t.status === 'PUBLISHED' ? 'text-emerald-500' : 'text-amber-500',
        bg: t.status === 'PUBLISHED' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30',
        message: `"${t.title}" is ${t.status === 'PUBLISHED' ? 'published' : 'in draft'}`,
        time: t.updatedAt || t.createdAt,
      }))
      setRecentActivity(activities)
    } catch (e) { console.error('fetchTrainings error:', e.message) }
  }

  const fetchFeedbacks = async () => {
    try {
      const r = await fetch(`${API}/trainer/feedbacks`, { headers: auth() })
      const d = await r.json()
      const list = d.feedbacks || []
      setFeedbacks(list)
      setStats(p => ({ ...p, avgTrainerRating: d.averageTrainerRating || 0, totalFeedbacks: list.length }))
    } catch (e) { console.error('fetchFeedbacks error:', e.message) }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    try {
      const r = await fetch(`${API}/feedback/${replyModal.id}/reply`, {
        method: 'POST', headers: auth(), body: JSON.stringify({ trainerResponse: replyText })
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || d.success === false) { showError(d.error || 'Failed to save reply'); return }
      success('Reply submitted!')
      setReplyModal(null); setReplyText(''); fetchFeedbacks()
    } catch (e) { showError(e.message) }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'
  const fmtTimeAgo = (d) => {
    if (!d) return ''
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }
  const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'TR'
  const Stars = ({ v }) => (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={13} className={s <= v ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'} />
      ))}
    </span>
  )

  const paginatedFeedbacks = [...feedbacks].slice(
    (feedbackPage - 1) * feedbackItemsPerPage,
    feedbackPage * feedbackItemsPerPage
  )
  const totalFeedbackPages = Math.ceil(feedbacks.length / feedbackItemsPerPage)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1600px] mx-auto px-8 py-8 min-h-screen">
      {/* Welcome Banner & KPI Cards only on Overview tab */}
      {tab === 'overview' && (
        <>
          {/* Welcome Banner */}
          <motion.div
            variants={item}
            style={{
              height: 170,
              background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)',
              borderRadius: 24,
              padding: '24px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#fff',
              marginBottom: 32,
              boxShadow: '0 4px 20px rgba(37,99,235,0.15)'
            }}
            className="flex-col md:flex-row gap-4"
          >
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Welcome back, {user.name} 👋
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '6px 0 0' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: 'Manage Courses', action: () => onTabChange('courses') },
                { label: 'Analytics', action: () => onTabChange('reports') },
                { label: 'Create Training', action: () => {
                  onTabChange('courses');
                  setTimeout(() => {
                    const event = new CustomEvent('open-create-course');
                    window.dispatchEvent(event);
                  }, 150);
                }},
                { label: 'View Profile', action: () => onTabChange('profile') }
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} style={{
                  padding: '10px 16px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }} className="hover:bg-white hover:text-[#2563EB]">
                  {btn.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* KPI Cards */}
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KpiCard icon={BookOpen} label="Total Trainings" value={stats.totalTrainings} trend="+8%" trendColor="green" progress={60} bgIcon="#EFF6FF" colorIcon="#2563EB" />
            <KpiCard icon={Users} label="Active Learners" value={stats.totalLearners} trend="+12%" trendColor="green" progress={75} bgIcon="#ECFDF5" colorIcon="#10B981" />
            <KpiCard icon={Star} label="Average Rating" value={stats.avgTrainerRating ? Number(stats.avgTrainerRating).toFixed(1) : '—'} trend="+2.4%" trendColor="green" progress={92} bgIcon="#FFFBEB" colorIcon="#D97706" />
            <KpiCard icon={MessageSquare} label="Feedback Received" value={stats.totalFeedbacks} trend="+5%" trendColor="green" progress={45} bgIcon="#EEF2F6" colorIcon="#475569" />
          </motion.div>
        </>
      )}

      {/* Tab Content */}
      {tab === 'overview' && (
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
                <p className="text-xs text-slate-500 mt-0.5">Latest updates from your courses</p>
              </div>
              <button onClick={() => onTabChange('courses')} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="p-5">
              {recentActivity.length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" description="Activity from your courses will appear here." />
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.bg}`}>
                        <a.icon size={16} className={a.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{a.message}</p>
                        <p className="text-[11px] text-slate-400">{fmtTimeAgo(a.time)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="space-y-6">
            {/* Rating Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Rating Summary</h3>
              {feedbacks.length === 0 ? (
                <p className="text-sm text-slate-400">No feedback yet</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{Number(stats.avgTrainerRating || 0).toFixed(1)}</div>
                    <div>
                      <Stars v={Math.round(stats.avgTrainerRating)} />
                      <p className="text-xs text-slate-500 mt-0.5">{stats.totalFeedbacks} reviews</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => onTabChange('feedback')} className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors">
                      View all feedback →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Courses Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Courses</h3>
              <div className="space-y-3">
                {trainings.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                      <BookOpen size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-400">{t.enrolledCount || t.participantCount || 0} learners</p>
                    </div>
                    <Badge color={t.status === 'PUBLISHED' ? 'success' : 'warning'} className="text-[10px]">
                      {t.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                    </Badge>
                  </div>
                ))}
              </div>
              {trainings.length > 4 && (
                <button onClick={() => onTabChange('courses')} className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 py-2 mt-3 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors">
                  View all {trainings.length} courses →
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'courses' && (
        <motion.div variants={item}>
          <TrainerCourses user={user} />
        </motion.div>
      )}

      {tab === 'feedback' && (
        <motion.div variants={item}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Feedback Received</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ratings and comments from participants</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{stats.avgTrainerRating ? Number(stats.avgTrainerRating).toFixed(1) : '—'}</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              {feedbacks.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No Feedback Yet" description="Feedback from participants will appear here." />
              ) : (
                <div className="space-y-4">
                  {paginatedFeedbacks.map((fb, i) => (
                    <motion.div
                      key={fb.id || i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-semibold shrink-0">
                        {fb.anonymous ? '?' : initials(fb.participantName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fb.anonymous ? 'Anonymous' : fb.participantName}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-400">{fmtDate(fb.submittedAt)}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          for <span className="font-medium text-slate-700 dark:text-slate-300">{fb.trainingTitle}</span>
                        </div>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Trainer:</span>
                            <Stars v={fb.trainerRating} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Subject:</span>
                            <Stars v={fb.subjectRating} />
                          </div>
                        </div>
                        {fb.comments && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">{fb.comments}</p>
                        )}
                        {fb.trainerResponse ? (
                          <div className="mt-2 text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 rounded-lg p-2">
                            <span className="font-semibold">Your reply:</span> {fb.trainerResponse}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setReplyModal(fb); setReplyText(''); }}
                            className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                          >
                            Reply →
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {totalFeedbackPages > 1 && (
                    <Pagination currentPage={feedbackPage} totalPages={totalFeedbackPages} onPageChange={setFeedbackPage} />
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'notes' && (
        <motion.div variants={item}>
          <NotesSection user={user} />
        </motion.div>
      )}

      {tab === 'reports' && (
        <motion.div variants={item}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reports & Analytics</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Participant progress, quiz results, and submissions</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={handleRegenerateCertificate}>Issue Certificates</Button>
                  <Button size="sm" variant="primary" onClick={fetchTrainerReport}>Refresh</Button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {!trainerReport ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <Activity size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-500">Loading report data...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard label="Average Progress" value={`${trainerReport.averageCompletion || 0}%`} icon={TrendingUp} variant="primary" />
                    <StatCard label="Pending Reviews" value={trainerReport.pendingReviews?.length || 0} icon={Clock} variant="amber" />
                    <StatCard label="Quiz Submissions" value={trainerReport.quizScores?.length || 0} icon={FileText} variant="blue" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Participant Progress</h3>
                    {(!trainerReport.participantProgress || trainerReport.participantProgress.length === 0) ? (
                      <EmptyState icon={Users} title="No participants enrolled" description="No participants enrolled yet." />
                    ) : (
                      <div className="space-y-2">
                        {trainerReport.participantProgress.slice(0, 5).map((p, i) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-semibold">
                              {initials(p.participantName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.participantName}</div>
                              <div className="text-xs text-slate-500">{p.title}</div>
                            </div>
                            <div className="w-24">
                              <ProgressBar value={p.progressPercent} max={100} showLabel color="primary" />
                            </div>
                            <Badge color="success">{p.avgQuizScore}%</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Reply Modal */}
      <AnimatePresence>
        {replyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setReplyModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Reply to Feedback</h3>
                <p className="text-sm text-slate-500 mt-1">from {replyModal.participantName}</p>
              </div>
              <form onSubmit={handleReply} className="p-6">
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={4}
                  value={replyText}
                  required
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your response..."
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setReplyModal(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">
                    Submit Reply
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ParticipantProfileView
        open={!!viewingParticipant}
        userId={viewingParticipant?.id}
        fallback={viewingParticipant ? { name: viewingParticipant.name } : null}
        onClose={() => setViewingParticipant(null)}
      />
    </motion.div>
  )
}

function KpiCard({ icon: Icon, label, value, trend, trendColor, progress, bgIcon, colorIcon }) {
  return (
    <div style={{
      height: 140, padding: '20px 24px', background: '#fff', border: '1px solid #E5E7EB',
      borderRadius: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden'
    }} className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-250">
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', background: bgIcon,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: colorIcon
        }}>
          <Icon size={20} />
        </div>
        {trend && (
          <span style={{
            display: 'inline-flex', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
            background: trendColor === 'green' ? '#DCFCE7' : '#FEF3C7',
            color: trendColor === 'green' ? '#15803D' : '#D97706'
          }}>
            {trend}
          </span>
        )}
      </div>

      {/* Value & Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{value}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginTop: 4 }}>{label}</span>
        </div>
        {progress !== undefined && (
          <div style={{ width: 80, paddingBottom: 6 }}>
            <div style={{ height: 4, width: '100%', background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#2563EB', borderRadius: 999 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrainerDashboard
