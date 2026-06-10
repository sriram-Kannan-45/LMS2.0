import { useState, useEffect } from 'react'
import TrainerList from '../components/TrainerList'
import ParticipantList from '../components/ParticipantList'
import ParticipantProfileView from '../components/shared/ParticipantProfileView'
import AssessmentSessionsPanel from '../components/admin/AssessmentSessionsPanel'
import AnimatedDropdown from '../components/AnimatedDropdown'
import { useToast } from '../components/Toast'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import Skeleton, { SkeletonStats, SkeletonTable } from '../components/Skeleton'
import { API, API_BASE } from '../api/api'
import { X, Plus, Loader2, Search } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
const initials = (name) => name ? name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'
const Stars = ({ v }) => (
  <span className="stars">
    {[1,2,3,4,5].map(s => <span key={s} className={`star ${s <= v ? 'filled' : ''}`}>&#9733;</span>)}
  </span>
)

function AdminDashboard({ user, onLogout, activeTab, onTabChange }) {
  const { success, error: showError, info, warning } = useToast()
  const [tab, setTab] = useState(activeTab || 'overview')

  useEffect(() => {
    if (activeTab) setTab(activeTab)
  }, [activeTab])

  const handleTabChange = (newTab) => {
    setTab(newTab)
    if (onTabChange) onTabChange(newTab)
  }
  const [trainers, setTrainers] = useState([])
  const [trainings, setTrainings] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [participants, setParticipants] = useState([])
  const [pendingParticipants, setPendingParticipants] = useState([])
  const [questions, setQuestions] = useState([])
  const [notes, setNotes] = useState([])
  const [noteFilter, setNoteFilter] = useState('')
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [viewingParticipant, setViewingParticipant] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({})

  const [trainerForm, setTrainerForm] = useState({ name: '', email: '', password: '' })
  const [trainingForm, setTrainingForm] = useState({ title: '', description: '', trainerId: '', startDate: '', endDate: '', capacity: '' })
  const [questionForm, setQuestionForm] = useState({ trainingId: '', questionText: '', questionType: 'TEXT', options: '' })
  const [addParticipantModal, setAddParticipantModal] = useState(false)
  const [participantForm, setParticipantForm] = useState({ name: '', email: '', phone: '', password: '' })

  // Programs & Courses state
  const [programs, setPrograms] = useState([])
  const [courses, setCourses] = useState([])
  const [programForm, setProgramForm] = useState({ title: '', description: '' })
  const [courseForm, setCourseForm] = useState({ title: '', description: '', trainerId: '', programId: '', status: 'ACTIVE' })

  const [initialLoading, setInitialLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState(null)

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  useEffect(() => {
    const loadAll = async () => {
      setInitialLoading(true)
      try {
        await fetchAll()
      } finally {
        setInitialLoading(false)
      }
    }
    loadAll()
  }, [])

  const fetchAll = async () => {
    await Promise.all([
      fetchStats(),
      fetchTrainers(),
      fetchTrainings(),
      fetchFeedbacks(),
      fetchParticipants(),
      fetchQuestions(),
      fetchPendingParticipants(),
      fetchNotes(),
      fetchPrograms(),
      fetchCourses()
    ])
  }

  const fetchStats = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/stats`, { headers: auth() })
      if (r.ok) setStats(await r.json())
    } catch {}
  }

  const fetchPendingParticipants = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/pending-participants`, { headers: auth() })
      const d = await r.json()
      setPendingParticipants(d.participants || [])
    } catch {}
  }

  const handleApproveParticipant = async (id) => {
    setConfirmModal({ action: 'approve-participant', id, title: 'Approve Participant?' })
  }

  const confirmAction = async () => {
    if (!confirmModal) return
    setLoading(true)
    try {
      if (confirmModal.action === 'approve-participant') {
        const r = await fetch(`${API_BASE}/admin/approve-participant/${confirmModal.id}`, { method: 'POST', headers: auth() })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        success('Participant approved successfully')
        fetchPendingParticipants(); fetchParticipants()
      } else if (confirmModal.action === 'delete-question') {
        const r = await fetch(`${API_BASE}/survey/${confirmModal.id}`, { method: 'DELETE', headers: auth() })
        if (!r.ok) throw new Error('Failed to delete question')
        success('Question deleted')
        fetchQuestions()
      } else if (confirmModal.action === 'delete-training') {
        const r = await fetch(`${API_BASE}/admin/trainings/${confirmModal.id}`, { method: 'DELETE', headers: auth() })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        success('Training deleted successfully')
        fetchTrainings(); fetchStats()
      } else if (confirmModal.action === 'delete-participant') {
        const r = await fetch(`${API_BASE}/admin/participants/${confirmModal.id}`, { method: 'DELETE', headers: auth() })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        success('Participant removed successfully')
        fetchParticipants(); fetchStats()
      } else if (confirmModal.action === 'delete-trainer') {
        const r = await fetch(`${API_BASE}/admin/trainers/${confirmModal.id}`, { method: 'DELETE', headers: auth() })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        success('Trainer removed successfully')
        fetchTrainers(); fetchStats()
      } else if (confirmModal.action === 'delete-program') {
        const r = await fetch(`${API_BASE}/admin/training-programs/${confirmModal.id}`, { method: 'DELETE', headers: auth() })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        success('Program deleted successfully')
        fetchPrograms()
      } else if (confirmModal.action === 'delete-course') {
        const r = await fetch(`${API_BASE}/admin/courses/${confirmModal.id}`, { method: 'DELETE', headers: auth() })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        success('Course deleted successfully')
        fetchCourses()
      }
    } catch (e) { 
      showError(e.message) 
    } finally { 
      setLoading(false)
      setConfirmModal(null)
    }
  }

  const fetchTrainers = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/trainers`, { headers: auth() })
      const d = await r.json()
      const trainers = d.trainers || (d.data && d.data.trainers) || []
      setTrainers(trainers)
    } catch (e) { console.error('fetchTrainers error:', e.message) }
  }

  const fetchTrainings = async () => {
    try {
      const r = await fetch(`${API_BASE}/trainings`, { headers: auth() })
      const d = await r.json()
      setTrainings(Array.isArray(d) ? d : (d.trainings || []))
    } catch {}
  }

  const fetchFeedbacks = async () => {
    try {
      const r = await fetch(`${API_BASE}/feedback/admin-feedbacks`, { headers: auth() })
      const d = await r.json()
      setFeedbacks(d.feedbacks || [])
    } catch {}
  }

  const fetchParticipants = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/participants`, { headers: auth() })
      const d = await r.json()
      const participants = d.participants || (d.data && d.data.participants) || []
      setParticipants(participants)
    } catch (e) { console.error('fetchParticipants error:', e.message) }
  }

  const fetchQuestions = async () => {
    try {
      const r = await fetch(`${API_BASE}/survey`, { headers: auth() })
      const d = await r.json()
      setQuestions(d.questions || [])
    } catch {}
  }

  const fetchNotes = async (status = '') => {
    try {
      const url = status 
        ? `${API_BASE}/notes/admin/notes?status=${status}`
        : `${API_BASE}/notes/admin/notes`
      const r = await fetch(url, { headers: auth() })
      const d = await r.json()
      setNotes(d.notes || [])
    } catch {}
  }

  const fetchPrograms = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/training-programs`, { headers: auth() })
      const d = await r.json()
      setPrograms(d.programs || (d.data && d.data.programs) || [])
    } catch {}
  }

  const fetchCourses = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/courses`, { headers: auth() })
      const d = await r.json()
      setCourses(d.courses || (d.data && d.data.courses) || [])
    } catch {}
  }

  const handleApproveNote = async (noteId) => {
    setLoading(true)
    try {
      setNotes(prev => prev.filter(note => note.id !== noteId))
      const r = await fetch(`${API_BASE}/notes/${noteId}/status`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ status: 'APPROVED' })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to approve note')
      success('Note approved successfully!')
    } catch (e) {
      await fetchNotes(noteFilter)
      showError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectNote = async (noteId) => {
    setLoading(true)
    try {
      setNotes(prev => prev.filter(note => note.id !== noteId))
      const r = await fetch(`${API_BASE}/notes/${noteId}/status`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({ status: 'REJECTED' })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to reject note')
      success('Note rejected successfully!')
    } catch (e) {
      await fetchNotes(noteFilter)
      showError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTrainer = async (e) => {
    e.preventDefault(); setLoading(true); setCredentials(null)
    try {
      const r = await fetch(`${API_BASE}/admin/create-trainer`, { method: 'POST', headers: auth(), body: JSON.stringify(trainerForm) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setTrainerForm({ name: '', email: '', password: '' })
      fetchTrainers(); fetchStats()
      success('Trainer account created successfully.')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const handleCreateTraining = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/trainings`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ ...trainingForm, trainerId: parseInt(trainingForm.trainerId), capacity: trainingForm.capacity ? parseInt(trainingForm.capacity) : null })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setTrainingForm({ title: '', description: '', trainerId: '', startDate: '', endDate: '', capacity: '' })
      fetchTrainings(); fetchStats()
      success('Training session created successfully.')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const handleCreateQuestion = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const opts = questionForm.options.split(',').map(s => s.trim()).filter(Boolean)
      const body = { ...questionForm, options: questionForm.questionType === 'MULTIPLE_CHOICE' ? opts : null }
      const r = await fetch(`${API}/survey`, { method: 'POST', headers: auth(), body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setQuestionForm({ trainingId: '', questionText: '', questionType: 'TEXT', options: '' })
      fetchQuestions()
      success('Survey question created.')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const handleCreateParticipant = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const r = await fetch(API.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participantForm)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setParticipantForm({ name: '', email: '', phone: '', password: '' })
      setAddParticipantModal(false)
      fetchParticipants(); fetchStats()
      success('Participant account created successfully.')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const handleCreateProgram = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/training-programs`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify(programForm)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setProgramForm({ title: '', description: '' })
      fetchPrograms()
      success('Program created successfully.')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const handleCreateCourse = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const body = {
        title: courseForm.title,
        description: courseForm.description,
        trainerId: parseInt(courseForm.trainerId),
        programId: courseForm.programId ? parseInt(courseForm.programId) : undefined,
        status: courseForm.status
      }
      const r = await fetch(`${API_BASE}/admin/training-programs/${courseForm.programId}/courses`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setCourseForm({ title: '', description: '', trainerId: '', programId: '', status: 'ACTIVE' })
      fetchCourses(); fetchPrograms()
      success('Course created successfully.')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const handleDeleteQuestion = async (id) => {
    setConfirmModal({ action: 'delete-question', id, title: 'Delete Question?' })
  }

  const handleDeleteTraining = async (id, title) => {
    setConfirmModal({ action: 'delete-training', id, title: `Delete training "${title}"?`, subtitle: 'This will remove all associated enrollments and feedback.' })
  }

  const handleDeleteParticipant = async (id, name) => {
    setConfirmModal({ action: 'delete-participant', id, title: `Delete participant "${name}"?`, subtitle: 'All their enrollments and feedback will also be removed.' })
  }

  const handleDeleteTrainer = async (id, name) => {
    setConfirmModal({ action: 'delete-trainer', id, title: `Delete trainer "${name}"?`, subtitle: 'Their training assignments will be unlinked.' })
  }

  const handleDeleteProgram = async (id, name) => {
    setConfirmModal({ action: 'delete-program', id, title: `Delete program "${name}"?` })
  }

  const handleDeleteCourse = async (id, name) => {
    setConfirmModal({ action: 'delete-course', id, title: `Delete course "${name}"?` })
  }

  const openEdit = (t) => {
    setEditModal(t)
    setEditForm({
      title: t.title,
      description: t.description || '',
      trainerId: t.trainerId || '',
      startDate: t.startDate ? t.startDate.slice(0, 16) : '',
      endDate: t.endDate ? t.endDate.slice(0, 16) : '',
      capacity: t.capacity || ''
    })
  }

  const handleUpdateTraining = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/trainings/${editModal.id}`, {
        method: 'PUT', headers: auth(),
        body: JSON.stringify({ ...editForm, trainerId: editForm.trainerId ? parseInt(editForm.trainerId) : undefined })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setEditModal(null); fetchTrainings()
      success('Training updated successfully.')
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const handleSendReminders = async (trainingId) => {
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/send-reminders/${trainingId}`, { method: 'POST', headers: auth() })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      info(d.message)
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'pending', label: 'Pending Approval' },
    { key: 'trainings', label: 'Trainings' },
    { key: 'trainers', label: 'Trainers' },
    { key: 'participants', label: 'Participants' },
    { key: 'sessions', label: 'Assessment Sessions' },
    { key: 'notes', label: 'Notes Management' },
    { key: 'feedback', label: 'Feedback Reports' },
    { key: 'surveys', label: 'Survey Config' },
  ]

  const getChartData = () => {
    const trainingGroups = {}
    feedbacks.forEach(f => {
      if (!trainingGroups[f.trainingTitle]) {
        trainingGroups[f.trainingTitle] = { tr: 0, sr: 0, count: 0 }
      }
      trainingGroups[f.trainingTitle].tr += f.trainerRating
      trainingGroups[f.trainingTitle].sr += f.subjectRating
      trainingGroups[f.trainingTitle].count++
    })
    const labels = Object.keys(trainingGroups)
    const trData = labels.map(l => (trainingGroups[l].tr / trainingGroups[l].count).toFixed(1))
    const srData = labels.map(l => (trainingGroups[l].sr / trainingGroups[l].count).toFixed(1))
    return {
      labels,
      datasets: [
        { label: 'Avg Trainer Rating', data: trData, backgroundColor: 'rgba(99, 102, 241, 0.6)' },
        { label: 'Avg Subject Rating', data: srData, backgroundColor: 'rgba(139, 92, 246, 0.5)' }
      ]
    }
  }

  const getTopTrainer = () => {
    const trStats = {}
    feedbacks.forEach(f => {
      if (!f.trainerName) return
      if (!trStats[f.trainerName]) trStats[f.trainerName] = { score: 0, count: 0 }
      trStats[f.trainerName].score += f.trainerRating
      trStats[f.trainerName].count++
    })
    let top = { name: '-', avg: 0 }
    Object.entries(trStats).forEach(([name, data]) => {
      const avg = data.score / data.count
      if (avg > top.avg) { top = { name, avg } }
    })
    return top
  }

  const topTrainer = getTopTrainer()

  if (!user || !user.token) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f6f8fa'
      }}>
        <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} size={24} />
        <span style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>Verifying session...</span>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Dashboard Overview</h2>
          </div>
          {initialLoading ? (
            <SkeletonStats />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card p-5">
                  <div className="stat-label">Total Trainings</div>
                  <div className="stat-value">{stats.totalTrainings ?? 0}</div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Trainers</div>
                  <div className="stat-value">{stats.totalTrainers ?? 0}</div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Participants</div>
                  <div className="stat-value">{stats.totalParticipants ?? 0}</div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Active Enrollments</div>
                  <div className="stat-value">{stats.totalEnrollments ?? 0}</div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Feedback Responses</div>
                  <div className="stat-value">{stats.totalFeedbacks ?? 0}</div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Avg Trainer Rating</div>
                  <div className="stat-value">{stats.avgTrainerRating ?? '0.0'} <span className="text-xs text-slate-400 font-medium">/5</span></div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Top Trainer</div>
                  <div className="stat-value" style={{ fontSize: '18px' }}>{topTrainer.name}</div>
                </div>
                <div className="card p-5">
                  <div className="stat-label">Satisfaction</div>
                  <div className="stat-value">{stats.satisfactionScore ?? '0.0'} <span className="text-xs text-slate-400 font-medium">/5</span></div>
                </div>
              </div>
              <div className="card p-5 mt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Feedback Trends</h3>
                {feedbacks.length > 0 ? (
                  <div style={{ height: 260 }}>
                    <Bar data={getChartData()} options={{ maintainAspectRatio: false }} />
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Feedback trends will appear once participants start submitting feedback.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PENDING APPROVAL ── */}
      {tab === 'pending' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Pending Approval</h2>
          </div>
          <div className="card p-0">
            {initialLoading ? (
              <SkeletonTable rows={3} />
            ) : pendingParticipants.length === 0 ? (
              <div className="empty-state p-8">
                <p className="text-sm text-slate-500">No participants are currently waiting for approval.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table className="table">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th></th></tr></thead>
                  <tbody>
                    {pendingParticipants.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td className="font-medium">{p.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.email}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.phone || '-'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.created_at)}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => handleApproveParticipant(p.id)} disabled={loading} style={{ fontSize: 12 }}>Approve</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRAININGS (list) ── */}
      {tab === 'trainings' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Training Sessions <span className="text-slate-400 font-normal text-sm ml-1">({trainings.length})</span></h2>
            <button className="btn btn-primary btn-sm" onClick={() => handleTabChange('createTraining')}>+ Add Training</button>
          </div>
          <div className="card p-0">
            {initialLoading ? (
              <SkeletonTable rows={5} />
            ) : trainings.length === 0 ? (
              <div className="empty-state p-8">
                <p className="text-sm text-slate-500">No training sessions created yet.</p>
                <button className="btn btn-primary mt-3" onClick={() => handleTabChange('createTraining')}>+ Create Training</button>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Title</th><th>Trainer</th><th>Start</th><th>End</th><th>Capacity</th><th>Enrolled</th><th></th></tr>
                  </thead>
                  <tbody>
                    {trainings.map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td className="font-medium">{t.title}</td>
                        <td>{t.trainerName ? <span className="badge badge-blue">{t.trainerName}</span> : <span className="badge badge-gray">Unassigned</span>}</td>
                        <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtDate(t.startDate)}</td>
                        <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{fmtDate(t.endDate)}</td>
                        <td>{t.capacity ? t.capacity : <span className="badge badge-gray">∞</span>}</td>
                        <td>{t.enrolledCount ?? 0}</td>
                        <td>
                          <div className="flex gap-1.5 justify-end">
                            <button className="btn btn-sm" onClick={() => openEdit(t)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTraining(t.id, t.title)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TRAINERS (list) ── */}
      {tab === 'trainers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Trainers <span className="text-slate-400 font-normal text-sm ml-1">({trainers.length})</span></h2>
            <button className="btn btn-primary btn-sm" onClick={() => handleTabChange('createTrainer')}>+ Add Trainer</button>
          </div>
          <div className="card">
            <TrainerList 
              trainers={trainers}
              token={user.token}
              onDelete={handleDeleteTrainer}
              onAddTrainer={() => handleTabChange('createTrainer')}
            />
          </div>
        </div>
      )}

      {/* ── PARTICIPANTS ── */}
      {tab === 'participants' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Participants</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setAddParticipantModal(true)}>+ Add Participant</button>
          </div>
          <div className="card">
            {initialLoading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading participants...</div>
            ) : (
              <ParticipantList 
                participants={participants}
                loading={false}
                onDelete={handleDeleteParticipant}
                onRefresh={() => fetchParticipants()}
                onView={(p) => setViewingParticipant(p)}
                onApprove={async (id) => {
                  const r = await fetch(`${API_BASE}/admin/approve-participant/${id}`, { method: 'POST', headers: auth() })
                  if (r.ok) {
                    success('Participant approved successfully')
                    fetchParticipants()
                  } else {
                    const d = await r.json()
                    showError(d.error || 'Failed to approve participant')
                  }
                }}
                onReject={async (id) => {
                  const r = await fetch(`${API_BASE}/admin/reject-participant/${id}`, { method: 'POST', headers: auth() })
                  if (r.ok) {
                    success('Participant rejected successfully')
                    fetchParticipants()
                  } else {
                    const d = await r.json()
                    showError(d.error || 'Failed to reject participant')
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── ASSESSMENT SESSIONS ── */}
      {tab === 'sessions' && (
        <AssessmentSessionsPanel />
      )}

      {/* ── SURVEYS ── */}
      {tab === 'surveys' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Survey Questions</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
            <div className="card">
              <div className="card-header"><h3>Add Question</h3></div>
              <form onSubmit={handleCreateQuestion}>
                <div className="form-group">
                  <AnimatedDropdown
                    label="Training (Optional)"
                    options={[
                      { value: '', label: 'Apply to ALL Trainings' },
                      ...trainings.map(t => ({ value: t.id, label: t.title }))
                    ]}
                    value={questionForm.trainingId}
                    onChange={(val) => setQuestionForm(p => ({ ...p, trainingId: val }))}
                  />
                </div>
                <div className="form-group">
                  <AnimatedDropdown
                    label="Question Type"
                    options={[
                      { value: 'TEXT', label: 'Text Answer' },
                      { value: 'RATING', label: 'Rating (1-5)' },
                      { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' }
                    ]}
                    value={questionForm.questionType}
                    onChange={(val) => setQuestionForm(p => ({ ...p, questionType: val }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Question Text</label>
                  <input className="form-control" type="text" value={questionForm.questionText} required onChange={e => setQuestionForm(p => ({ ...p, questionText: e.target.value }))} placeholder="Enter survey question" />
                </div>
                {questionForm.questionType === 'MULTIPLE_CHOICE' && (
                  <div className="form-group">
                    <label className="form-label">Options (comma separated)</label>
                    <input className="form-control" type="text" value={questionForm.options} placeholder="Option A, Option B, Option C" required onChange={e => setQuestionForm(p => ({ ...p, options: e.target.value }))} />
                  </div>
                )}
                <button type="submit" className="btn btn-primary mt-2" disabled={loading}>Add Question</button>
              </form>
            </div>
            <div className="card p-0">
              <div className="card-header px-5 pt-5 pb-0" style={{ border: 'none', margin: 0 }}>
                <h3>Questions ({questions.length})</h3>
              </div>
              {questions.length === 0 ? (
                <div className="empty-state p-6">
                  <p className="text-sm text-slate-500">No custom questions added.</p>
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table className="table">
                    <thead><tr><th>Target</th><th>Question</th><th>Type</th><th>Options</th><th></th></tr></thead>
                    <tbody>
                      {questions.map(q => {
                        const trg = q.trainingId ? trainings.find(t => t.id === q.trainingId)?.title || 'Specific' : 'Global'
                        return (
                          <tr key={q.id}>
                            <td><span className={q.trainingId ? "badge badge-blue" : "badge badge-gray"}>{trg}</span></td>
                            <td>{q.questionText}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{q.questionType}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{q.options ? q.options.join(', ') : '-'}</td>
                            <td><button className="btn btn-sm btn-danger" onClick={() => handleDeleteQuestion(q.id)}>Delete</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTES MANAGEMENT ── */}
      {tab === 'notes' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Notes Management</h2>
            <div className="flex gap-2">
              {[
                { key: '', label: 'All', count: notes.length },
                { key: 'pending', label: 'Pending', count: notes.filter(n => n.status?.toLowerCase() === 'pending').length },
                { key: 'approved', label: 'Approved', count: notes.filter(n => n.status?.toLowerCase() === 'approved').length }
              ].map(btn => (
                <button
                  key={btn.key}
                  onClick={() => { setNoteFilter(btn.key); fetchNotes(btn.key) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    noteFilter === btn.key
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {btn.label} ({btn.count})
                </button>
              ))}
            </div>
          </div>
          {notes.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-sm text-slate-500">
                {noteFilter === 'pending' ? 'All pending notes have been reviewed.' : 
                 noteFilter === 'approved' ? 'No approved notes yet.' : 
                 'Notes will appear here when trainers upload them.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map((note, idx) => {
                const isPending = note.status?.toUpperCase() === 'PENDING'
                const isApproved = note.status?.toUpperCase() === 'APPROVED'
                return (
                  <div key={note.id || idx} className="card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isApproved ? 'bg-emerald-50 text-emerald-700' :
                            isPending ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>{note.status}</span>
                          <span className="text-xs text-slate-400">{fmtDate(note.created_at)}</span>
                        </div>
                        <h4 className="font-semibold text-sm text-slate-800">{note.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{note.trainer?.name || 'Unknown'}</p>
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{note.content}</p>
                      </div>
                      {isPending && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button className="btn btn-sm btn-danger" onClick={() => handleRejectNote(note.id)} disabled={loading}>Reject</button>
                          <button className="btn btn-sm btn-primary" onClick={() => handleApproveNote(note.id)} disabled={loading}>Approve</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FEEDBACK REPORTS ── */}
      {tab === 'feedback' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Feedback Reports</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="card p-5">
              <div className="stat-label">Total Responses</div>
              <div className="stat-value">{feedbacks.length}</div>
            </div>
            <div className="card p-5">
              <div className="stat-label">Avg Trainer Rating</div>
              <div className="stat-value">{stats.avgTrainerRating ?? '0.0'} <span className="text-xs text-slate-400 font-medium">/5</span></div>
            </div>
            <div className="card p-5">
              <div className="stat-label">Avg Subject Rating</div>
              <div className="stat-value">{stats.avgSubjectRating ?? '0.0'} <span className="text-xs text-slate-400 font-medium">/5</span></div>
            </div>
          </div>
          <div className="card p-0">
            {initialLoading ? (
              <SkeletonTable rows={5} />
            ) : feedbacks.length === 0 ? (
              <div className="empty-state p-8">
                <p className="text-sm text-slate-500">No feedback submitted yet.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Training</th><th>Trainer</th><th>Participant</th><th>Trainer Rating</th><th>Subject Rating</th><th>Comments</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {feedbacks.map((f, i) => (
                      <tr key={f.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td className="font-medium">{f.trainingTitle}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{f.trainerName}</td>
                        <td>{f.anonymous ? <span className="badge badge-gray">Anonymous</span> : f.participantName}</td>
                        <td><Stars v={f.trainerRating} /> <span className="text-xs text-slate-400 ml-1">{f.trainerRating}/5</span></td>
                        <td><Stars v={f.subjectRating} /> <span className="text-xs text-slate-400 ml-1">{f.subjectRating}/5</span></td>
                        <td style={{ maxWidth: 150, color: 'var(--text-secondary)', fontSize: 13 }}>{f.comments || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{fmtDate(f.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE TRAINER (two-column layout) ── */}
      {tab === 'createTrainer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
          <div className="card">
            <div className="card-header"><h3>Create Trainer Account</h3></div>
            <form onSubmit={handleCreateTrainer}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" type="text" value={trainerForm.name}
                  onChange={e => setTrainerForm(p => ({ ...p, name: e.target.value }))} required placeholder="Trainer full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" value={trainerForm.email}
                  onChange={e => setTrainerForm(p => ({ ...p, email: e.target.value }))} required placeholder="trainer@company.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={trainerForm.password}
                  onChange={e => setTrainerForm(p => ({ ...p, password: e.target.value }))} required placeholder="Set password for trainer" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Trainer'}
              </button>
            </form>
          </div>
          <div className="card">
            <div className="card-header"><h3>Trainers ({trainers.length})</h3></div>
            <TrainerList
              trainers={trainers}
              token={user.token}
              onDelete={handleDeleteTrainer}
              onAddTrainer={() => handleTabChange('createTrainer')}
            />
          </div>
        </div>
      )}

      {/* ── CREATE TRAINING (two-column layout) ── */}
      {tab === 'createTraining' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
          <div className="card">
            <div className="card-header"><h3>Create Training Session</h3></div>
            <form onSubmit={handleCreateTraining}>
              <div className="form-group">
                <label className="form-label">Training Title</label>
                <input className="form-control" type="text" value={trainingForm.title}
                  onChange={e => setTrainingForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. React Fundamentals" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={trainingForm.description}
                  onChange={e => setTrainingForm(p => ({ ...p, description: e.target.value }))} placeholder="Training objectives and content overview..." />
              </div>
              <div className="form-group">
                <AnimatedDropdown
                  label="Assign Trainer"
                  options={[
                    { value: '', label: 'Select a trainer' },
                    ...trainers.map(t => ({ value: t.id, label: `${t.name} (${t.email})` }))
                  ]}
                  value={trainingForm.trainerId}
                  onChange={(val) => setTrainingForm(p => ({ ...p, trainerId: val }))}
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date &amp; Time</label>
                  <input className="form-control" type="datetime-local" value={trainingForm.startDate}
                    onChange={e => setTrainingForm(p => ({ ...p, startDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date &amp; Time</label>
                  <input className="form-control" type="datetime-local" value={trainingForm.endDate}
                    onChange={e => setTrainingForm(p => ({ ...p, endDate: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Capacity (blank for unlimited)</label>
                <input className="form-control" type="number" value={trainingForm.capacity}
                  onChange={e => setTrainingForm(p => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 30" min="1" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Training Session'}
              </button>
            </form>
          </div>
          <div className="card p-0">
            <div className="card-header px-5 pt-5 pb-0" style={{ border: 'none', margin: 0 }}>
              <h3>Recent Trainings</h3>
            </div>
            {trainings.length === 0 ? (
              <div className="empty-state p-6">
                <p className="text-sm text-slate-500">No training sessions created yet.</p>
              </div>
            ) : (
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr><th>Title</th><th>Trainer</th><th>Start</th><th>End</th><th></th></tr>
                  </thead>
                  <tbody>
                    {trainings.slice(0, 10).map(t => (
                      <tr key={t.id}>
                        <td className="font-medium">{t.title}</td>
                        <td>{t.trainerName ? <span className="badge badge-blue">{t.trainerName}</span> : <span className="badge badge-gray">Unassigned</span>}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(t.startDate)}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{fmtDate(t.endDate)}</td>
                        <td>
                          <div className="flex gap-1.5 justify-end">
                            <button className="btn btn-sm" onClick={() => openEdit(t)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTraining(t.id, t.title)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PROGRAMS & COURSES (two-column layout) ── */}
      {tab === 'programs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Programs & Courses</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24, marginBottom: 24 }}>
            <div className="card">
              <div className="card-header"><h3>Create Program</h3></div>
              <form onSubmit={handleCreateProgram}>
                <div className="form-group">
                  <label className="form-label">Program Title</label>
                  <input className="form-control" type="text" value={programForm.title}
                    onChange={e => setProgramForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Full Stack Development" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={programForm.description}
                    onChange={e => setProgramForm(p => ({ ...p, description: e.target.value }))} placeholder="Program overview..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>Create Program</button>
              </form>
            </div>
            <div className="card p-0">
              <div className="card-header px-5 pt-5 pb-0" style={{ border: 'none', margin: 0 }}>
                <h3>Programs ({programs.length})</h3>
              </div>
              {programs.length === 0 ? (
                <div className="empty-state p-6">
                  <p className="text-sm text-slate-500">No programs created yet.</p>
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table className="table">
                    <thead><tr><th>Title</th><th>Description</th><th>Courses</th><th></th></tr></thead>
                    <tbody>
                      {programs.map(p => (
                        <tr key={p.id}>
                          <td className="font-medium">{p.title}</td>
                          <td style={{ color: 'var(--text-secondary)', maxWidth: 200 }} className="text-sm">{(p.description || '').slice(0, 60)}</td>
                          <td>{p.courseCount ?? 0}</td>
                          <td><button className="btn btn-sm btn-danger" onClick={() => handleDeleteProgram(p.id, p.title)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
            <div className="card">
              <div className="card-header"><h3>Create Course</h3></div>
              <form onSubmit={handleCreateCourse}>
                <div className="form-group">
                  <label className="form-label">Course Title</label>
                  <input className="form-control" type="text" value={courseForm.title}
                    onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. React for Beginners" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={courseForm.description}
                    onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} placeholder="Course description..." />
                </div>
                <div className="form-group">
                  <AnimatedDropdown
                    label="Program"
                    options={[
                      ...programs.map(p => ({ value: p.id, label: p.title }))
                    ]}
                    value={courseForm.programId}
                    onChange={(val) => setCourseForm(p => ({ ...p, programId: val }))}
                  />
                </div>
                <div className="form-group">
                  <AnimatedDropdown
                    label="Assign Trainer"
                    options={[
                      { value: '', label: 'Select a trainer' },
                      ...trainers.map(t => ({ value: t.id, label: `${t.name} (${t.email})` }))
                    ]}
                    value={courseForm.trainerId}
                    onChange={(val) => setCourseForm(p => ({ ...p, trainerId: val }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>Create Course</button>
              </form>
            </div>
            <div className="card p-0">
              <div className="card-header px-5 pt-5 pb-0" style={{ border: 'none', margin: 0 }}>
                <h3>Courses ({courses.length})</h3>
              </div>
              {courses.length === 0 ? (
                <div className="empty-state p-6">
                  <p className="text-sm text-slate-500">No courses created yet.</p>
                </div>
              ) : (
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table className="table">
                    <thead><tr><th>Title</th><th>Program</th><th>Trainer</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {courses.map(c => (
                        <tr key={c.id}>
                          <td className="font-medium">{c.title}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.programTitle || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.trainerName || 'Unassigned'}</td>
                          <td><span className={`badge ${c.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{c.status || 'ACTIVE'}</span></td>
                          <td><button className="btn btn-sm btn-danger" onClick={() => handleDeleteCourse(c.id, c.title)}>Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Training Session</h3>
              <button className="modal-close" onClick={() => setEditModal(null)}>&#10005;</button>
            </div>
            <form onSubmit={handleUpdateTraining}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-control" type="text" value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <AnimatedDropdown
                  label="Trainer"
                  options={[
                    { value: '', label: 'No trainer assigned' },
                    ...trainers.map(t => ({ value: t.id, label: t.name }))
                  ]}
                  value={editForm.trainerId}
                  onChange={(val) => setEditForm(p => ({ ...p, trainerId: val }))}
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-control" type="datetime-local" value={editForm.startDate}
                    onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-control" type="datetime-local" value={editForm.endDate}
                    onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
               <label className="form-label">Capacity</label>
                <input className="form-control" type="number" value={editForm.capacity}
                  onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value }))} placeholder="Unlimited" min="1" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{confirmModal.title}</h3>
              <button type="button" className="modal-close" onClick={() => setConfirmModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {confirmModal.subtitle && <p className="text-sm text-slate-500 mb-4">{confirmModal.subtitle}</p>}
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setConfirmModal(null)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={confirmAction} disabled={loading}>
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD PARTICIPANT MODAL ── */}
      {addParticipantModal && (
        <div className="modal-overlay" onClick={() => setAddParticipantModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Add New Participant</h3>
              <button className="modal-close" onClick={() => setAddParticipantModal(false)}>&#10005;</button>
            </div>
            <form onSubmit={handleCreateParticipant}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" type="text" value={participantForm.name}
                  onChange={e => setParticipantForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. John Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" value={participantForm.email}
                  onChange={e => setParticipantForm(p => ({ ...p, email: e.target.value }))} required placeholder="e.g. john@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-control" type="tel" value={participantForm.phone}
                  onChange={e => setParticipantForm(p => ({ ...p, phone: e.target.value }))} required placeholder="e.g. +91 9876543210" />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={participantForm.password}
                  onChange={e => setParticipantForm(p => ({ ...p, password: e.target.value }))} required placeholder="Min 6 characters" minLength="6" />
              </div>
              <div className="modal-footer mt-6">
                <button type="button" className="btn" onClick={() => setAddParticipantModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ParticipantProfileView
        open={!!viewingParticipant}
        userId={viewingParticipant?.id}
        fallback={viewingParticipant ? {
          name: viewingParticipant.name,
          email: viewingParticipant.email,
          createdAt: viewingParticipant.created_at || viewingParticipant.joinedAt,
        } : null}
        onClose={() => setViewingParticipant(null)}
      />
    </div>
  )
}

export default AdminDashboard
