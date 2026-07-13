import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, Plus, Pencil, Trash2, GripVertical,
  BookOpen, FileText, Users, BarChart3, Layers, Sparkles,
  CheckCircle2, AlertCircle, Calendar, Folder, MessageSquare, Code
} from 'lucide-react'
import { API, assetUrl } from '../api/api'
import { Button, Badge, Table, PageHeader, EmptyState, StatCard, ProgressBar } from '../components/ui'
import { useToast } from '../components/Toast'
import MaterialManager from '../components/trainer/MaterialManager'
import CourseQuizzesTab from '../components/trainer/CourseQuizzesTab'
import CourseParticipantsTab from '../components/trainer/CourseParticipantsTab'
import CourseAnalyticsTab from '../components/trainer/CourseAnalyticsTab'
import DiscussionBoard from '../components/shared/DiscussionBoard'
import CourseCodingTab from '../components/trainer/CourseCodingTab'

const STATUS_BADGE = {
  DRAFT:     { bg: '#f1f5f9', fg: '#475569', label: 'Draft' },
  PUBLISHED: { bg: '#dcfce7', fg: '#15803d', label: 'Published' },
  ARCHIVED:  { bg: '#fef3c7', fg: '#92400e', label: 'Archived' },
}

function StatusBadge({ value }) {
  const label = value?.toUpperCase() || 'DRAFT';
  const color = label === 'PUBLISHED' ? 'success' : label === 'ARCHIVED' ? 'warning' : 'neutral';
  return <Badge color={color}>{label}</Badge>;
}

function Stat({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13 }}>
      <span style={{ color: '#6366f1' }}>{icon}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <span style={{ color: '#94a3b8' }}>{label}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COURSES LIST PAGE
// ════════════════════════════════════════════════════════════════════════════
function CoursesList({ user, onOpenCourse }) {
  const { error: showError, success } = useToast()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [programs, setPrograms] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCourse, setNewCourse] = useState({ title: '', description: '', trainingProgramId: '', status: 'DRAFT', thumbnailUrl: '' })

  const auth = () => ({ Authorization: `Bearer ${user.token}` })

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const r = await fetch(API.TRAINER_COURSES.LIST, { headers: auth() })
      const d = await r.json()
      console.log('DEBUG - API Response (/trainer/courses):', d)
      if (d.success) setCourses(d.courses || [])
      else showError(d.error || 'Failed to load courses')
    } catch (e) {
      console.error('DEBUG - fetchCourses error:', e.message)
      showError(e.message || 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()

    // Fetch training programs for the select dropdown
    let aborted = false
    ;(async () => {
      try {
        const r = await fetch(`${API.TRAINER_COURSES.LIST.slice(0, -7)}programs`, { headers: auth() })
        const d = await r.json()
        if (!aborted && d.success) {
          setPrograms(d.programs || [])
        }
      } catch (e) {
        console.error('Failed to load programs:', e.message)
      }
    })()
    return () => { aborted = true }
  }, [])

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    if (!newCourse.title.trim()) { showError('Title is required'); return }
    if (!newCourse.trainingProgramId) { showError('Training Program is required'); return }

    try {
      const r = await fetch(API.TRAINER_COURSES.LIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify(newCourse),
      })
      const d = await r.json()
      if (!r.ok || d.success === false) { showError(d.error || 'Failed to create course'); return }
      success('Course created successfully!')
      setShowCreateModal(false)
      setNewCourse({ title: '', description: '', trainingProgramId: '', status: 'DRAFT', thumbnailUrl: '' })
      await fetchCourses()
    } catch (e) {
      showError(e.message)
    }
  }

  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (c.title || '').toLowerCase().includes(q) ||
               (c.description || '').toLowerCase().includes(q) ||
               (c.programTitle || '').toLowerCase().includes(q)
      }
      return true
    })
  }, [courses, search, statusFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Trainings"
        subtitle="All trainings assigned to you. Open one to manage lessons, materials, quizzes, and analytics."
      />

      {/* Search + filter row */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses by title, description, or program…"
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map(s => (
            <Button
              key={s}
              onClick={() => setStatusFilter(s)}
              variant={statusFilter === s ? 'primary' : 'ghost'}
              size="sm"
            >
              {s === 'ALL' ? 'All' : s.toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, height: 320, padding: 16 }}>
              <div style={{ height: 140, background: '#f1f5f9', borderRadius: 8, marginBottom: 12 }} />
              <div style={{ height: 14, background: '#f1f5f9', borderRadius: 4, marginBottom: 8, width: '70%' }} />
              <div style={{ height: 12, background: '#f1f5f9', borderRadius: 4, marginBottom: 8, width: '40%' }} />
              <div style={{ height: 30, background: '#f1f5f9', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12 }}>
          <BookOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', color: '#475569', fontSize: 18, fontWeight: 600 }}>
            {courses.length === 0 ? 'No courses assigned yet' : 'No courses match your filters'}
          </h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
            {courses.length === 0
              ? 'Ask your admin to assign you to a course under a Training Program.'
              : 'Try adjusting your search or status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer group"
              onClick={() => onOpenCourse(c.id)}
            >
              {/* Thumbnail */}
              <div
                className="h-44 relative bg-cover bg-center flex items-center justify-center text-white"
                style={{
                  backgroundImage: c.thumbnailUrl ? `url(${assetUrl(c.thumbnailUrl)})` : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                }}
              >
                {!c.thumbnailUrl && <BookOpen size={40} className="text-white/80 group-hover:scale-110 transition-transform duration-200" />}
                <div className="absolute top-3 left-3">
                  <StatusBadge value={c.status} />
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1.5 line-clamp-2 leading-snug">
                  {c.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                  <Folder size={12} />
                  <span>{c.programTitle || 'No program'}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                  {c.description || 'No description provided.'}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <FileText size={13} className="text-violet-500" />
                    <span>{c.lessonCount} <span className="text-slate-400 font-normal">Lessons</span></span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>{c.quizCount} <span className="text-slate-400 font-normal">Quizzes</span></span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <Users size={13} className="text-emerald-500" />
                    <span>{c.enrolledCount} <span className="text-slate-400 font-normal">Enrolled</span></span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}


    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COURSE DETAIL — 4 TABS
// ════════════════════════════════════════════════════════════════════════════
function CourseDetail({ user, courseId, onBack }) {
  const { error: showError, success } = useToast()
  const [tab, setTab] = useState('lessons')
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const auth = () => ({ Authorization: `Bearer ${user.token}` })

  const fetchCourse = async () => {
    try {
      const r = await fetch(API.TRAINER_COURSES.DETAIL(courseId), { headers: auth() })
      const d = await r.json()
      if (d.success) setCourse(d.course)
      else showError(d.error || 'Failed to load course')
    } catch (e) {
      showError(e.message)
    } finally { setLoading(false) }
  }
  useEffect(() => { fetchCourse() }, [courseId])

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ height: 40, width: 120, background: '#f1f5f9', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 200, background: '#f1f5f9', borderRadius: 12 }} />
      </div>
    )
  }
  if (!course) return null

  const TABS = [
    { key: 'lessons',      label: 'Lessons',      icon: <Layers size={16} /> },
    { key: 'quizzes',      label: 'AI Quiz',      icon: <Sparkles size={16} /> },
    { key: 'coding',       label: 'Coding',       icon: <Code size={16} /> },
    { key: 'participants', label: 'Participants', icon: <Users size={16} /> },
    { key: 'analytics',    label: 'Analytics',    icon: <BarChart3 size={16} /> },
    { key: 'discussions',  label: 'Discussions',  icon: <MessageSquare size={16} /> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="secondary" size="sm" icon={ArrowLeft}>
          Back to Trainings
        </Button>
      </div>

      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-6 items-center">
        <div
          className="w-48 h-32 rounded-xl flex-shrink-0 bg-cover bg-center flex items-center justify-center text-white"
          style={{
            backgroundImage: course.thumbnailUrl ? `url(${assetUrl(course.thumbnailUrl)})` : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          }}
        >
          {!course.thumbnailUrl && <BookOpen size={40} className="text-white/80" />}
        </div>

        <div className="flex-1 min-w-[240px] space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 leading-tight">{course.title}</h1>
            <StatusBadge value={course.status} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Folder size={13} />
            <span>{course.programTitle || 'No program'}</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
            {course.description || 'No description provided.'}
          </p>
          <div className="flex items-center gap-5 pt-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <FileText size={13} className="text-violet-500" />
              <span>{course.lessonCount} <span className="text-slate-400 font-normal">Lessons</span></span>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Sparkles size={13} className="text-amber-500" />
              <span>{course.quizCount} <span className="text-slate-400 font-normal">Quizzes</span></span>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Users size={13} className="text-emerald-500" />
              <span>{course.enrolledCount} <span className="text-slate-400 font-normal">Enrolled</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex gap-1.5 sticky top-2 z-10 shadow-sm border border-slate-200/20">
        {TABS.map(t => (
          <Button
            key={t.key}
            onClick={() => setTab(t.key)}
            variant={tab === t.key ? 'primary' : 'ghost'}
            className="flex-1 text-center justify-center font-semibold"
            icon={t.icon.type}
            size="sm"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'lessons'      && <LessonsTab user={user} courseId={courseId} onCountChange={fetchCourse} />}
          {tab === 'quizzes'      && <CourseQuizzesTab user={user} courseId={courseId} onCountChange={fetchCourse} />}
          {tab === 'coding'       && <CourseCodingTab user={user} courseId={courseId} onCountChange={fetchCourse} />}
          {tab === 'participants' && <CourseParticipantsTab user={user} courseId={courseId} />}
          {tab === 'analytics'    && <CourseAnalyticsTab user={user} courseId={courseId} />}
          {tab === 'discussions'  && <DiscussionBoard user={user} trainingId={course.trainingProgramId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function PlaceholderTab({ title, subtitle, icon }) {
  return (
    <div style={{
      padding: '60px 24px', textAlign: 'center', background: '#fff',
      border: '1px dashed #cbd5e1', borderRadius: 12,
    }}>
      <div style={{ color: '#cbd5e1', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px', color: '#475569' }}>{title}</h3>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>{subtitle}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LESSONS TAB — basic CRUD list (Step 5 scope)
// ════════════════════════════════════════════════════════════════════════════
function LessonsTab({ user, courseId, onCountChange }) {
  const { success, error: showError, info } = useToast()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null) // null=create, object=edit
  const [form, setForm] = useState({ title: '', description: '', content: '' })
  const [materialsFor, setMaterialsFor] = useState(null) // { id, title } | null
  const auth = () => ({ Authorization: `Bearer ${user.token}` })

  const fetchLessons = async () => {
    try {
      setLoading(true)
      const r = await fetch(API.TRAINER_COURSES.LESSONS(courseId), { headers: auth() })
      const d = await r.json()
      if (d.success) setLessons(d.lessons || [])
      else showError(d.error || 'Failed to load lessons')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchLessons() }, [courseId])

  const openCreate = () => { setEditing(null); setForm({ title: '', description: '', content: '' }); setShowModal(true) }
  const openEdit = (l) => { setEditing(l); setForm({ title: l.title || '', description: l.description || '', content: l.content || '' }); setShowModal(true) }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { showError('Title is required'); return }
    try {
      const url = editing
        ? API.TRAINER_COURSES.LESSON(courseId, editing.id)
        : API.TRAINER_COURSES.LESSONS(courseId)
      const r = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok || d.success === false) { showError(d.error || 'Save failed'); return }
      success(editing ? 'Lesson updated' : 'Lesson created')
      setShowModal(false)
      await fetchLessons()
      onCountChange?.()
    } catch (e) { showError(e.message) }
  }

  const remove = async (l) => {
    if (!window.confirm(`Delete lesson "${l.title}"? This cannot be undone.`)) return
    try {
      const r = await fetch(API.TRAINER_COURSES.LESSON(courseId, l.id), {
        method: 'DELETE', headers: auth(),
      })
      const d = await r.json()
      if (!r.ok || d.success === false) { showError(d.error || 'Delete failed'); return }
      success('Lesson deleted')
      await fetchLessons()
      onCountChange?.()
    } catch (e) { showError(e.message) }
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#0f172a' }}>
          {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={openCreate}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', background: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Create New Lesson
        </button>
      </div>

      {/* Lesson list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 80, background: '#f1f5f9', borderRadius: 10 }} />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12,
        }}>
          <Layers size={40} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: '0 0 6px', color: '#475569', fontWeight: 600 }}>No lessons yet</p>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
            Click <strong>Create New Lesson</strong> to add the first one.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lessons.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: 14, display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              {/* Drag handle (visual only for Step 5) */}
              <div style={{ color: '#cbd5e1', cursor: 'grab' }}>
                <GripVertical size={16} />
              </div>

              {/* Order number */}
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#eef2ff', color: '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {l.orderIndex + 1}
              </div>

              {/* Center */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                  {l.title}
                </div>
                {l.description && (
                  <div style={{
                    fontSize: 12, color: '#64748b',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {l.description}
                  </div>
                )}
                {/* Material pills */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {Object.entries(l.materialCounts || {}).filter(([_, n]) => n > 0).map(([type, n]) => (
                    <span key={type} style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      background: '#f1f5f9', color: '#475569', borderRadius: 999,
                      letterSpacing: 0.4,
                    }}>
                      {type} {n}
                    </span>
                  ))}
                  {l.hasAssessment && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      background: '#fef3c7', color: '#92400e', borderRadius: 999,
                      letterSpacing: 0.4,
                    }}>
                      ASSESSMENT
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  title="Manage materials"
                  onClick={() => setMaterialsFor({ id: l.id, title: l.title })}
                  style={iconBtn('#f1f5f9', '#475569')}
                >
                  <Layers size={14} />
                </button>
                <button title="Edit" onClick={() => openEdit(l)} style={iconBtn('#eef2ff', '#4f46e5')}>
                  <Pencil size={14} />
                </button>
                <button title="Delete" onClick={() => remove(l)} style={iconBtn('#fee2e2', '#dc2626')}>
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
            }}
          >
            <motion.form
              onClick={(e) => e.stopPropagation()}
              onSubmit={submit}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{
                background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 540,
                boxShadow: '0 25px 60px -10px rgba(0,0,0,0.25)',
              }}
            >
              <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {editing ? 'Edit Lesson' : 'Create New Lesson'}
              </h2>

              <label style={lblStyle}>Title <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to React Hooks"
                style={inputStyle}
                autoFocus
              />

              <label style={lblStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="One-line summary shown in the lesson list"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />

              <label style={lblStyle}>Intro / Summary (optional)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Optional intro text shown above the materials list"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button type="button" onClick={() => setShowModal(false)} style={btnSecondary}>
                  Cancel
                </button>
                <button type="submit" style={btnPrimary}>
                  {editing ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Material manager slide-over (Step 6) */}
      <MaterialManager
        user={user}
        lessonId={materialsFor?.id}
        lessonTitle={materialsFor?.title}
        open={!!materialsFor}
        onClose={() => setMaterialsFor(null)}
        onSaved={() => fetchLessons()}
      />
    </div>
  )
}

// Tiny style helpers shared across the page
const iconBtn = (bg, fg) => ({
  width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: 8,
  background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
})
const lblStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 12, marginBottom: 4 }
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const btnPrimary = {
  padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecondary = {
  padding: '10px 20px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC ENTRY — switches between list and detail
// ════════════════════════════════════════════════════════════════════════════
export default function TrainerCourses({ user }) {
  const [openCourseId, setOpenCourseId] = useState(null)

  if (openCourseId) {
    return (
      <CourseDetail
        user={user}
        courseId={openCourseId}
        onBack={() => setOpenCourseId(null)}
      />
    )
  }
  return <CoursesList user={user} onOpenCourse={setOpenCourseId} />
}

// Named exports for re-use in later steps (so Step 6 can import LessonsTab etc).
export { CoursesList, CourseDetail, LessonsTab, PlaceholderTab }
