import { useState, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import TrainerManagement from '../components/TrainerManagement'
import { API_BASE } from '../api/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

// Utility functions
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN') : '-'
const initials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'A'

const Stars = ({ v, size = 'sm' }) => (
  <div className={`flex gap-1 ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>
    {[1, 2, 3, 4, 5].map(s => (
      <span key={s} className={s <= v ? 'text-yellow-400' : 'text-gray-400'}>★</span>
    ))}
  </div>
)

function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState('overview')
  const [trainers, setTrainers] = useState([])
  const [trainings, setTrainings] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [participants, setParticipants] = useState([])
  const [pendingParticipants, setPendingParticipants] = useState([])
  const [stats, setStats] = useState({})
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  // Form states
  const [trainerForm, setTrainerForm] = useState({ name: '', email: '', password: '' })
  const [trainingForm, setTrainingForm] = useState({ title: '', description: '', trainerId: '', startDate: '', endDate: '', capacity: '' })
  const [editingTraining, setEditingTraining] = useState(null)

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` })

  const notify = (m, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m)
    setTimeout(() => { setErr(''); setMsg('') }, 4000)
  }

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    await Promise.all([
      fetchStats(),
      fetchTrainers(),
      fetchTrainings(),
      fetchFeedbacks(),
      fetchParticipants(),
      fetchPendingParticipants()
    ])
  }

  const fetchStats = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/stats`, { headers: auth() })
      if (r.ok) setStats(await r.json())
    } catch (e) { console.error(e) }
  }

  const fetchPendingParticipants = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/pending-participants`, { headers: auth() })
      const d = await r.json()
      setPendingParticipants(d.participants || [])
    } catch (e) { console.error(e) }
  }

  const fetchTrainers = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/trainers`, { headers: auth() })
      const d = await r.json()
      setTrainers(d.trainers || [])
    } catch (e) { console.error(e) }
  }

  const fetchTrainings = async () => {
    try {
      const r = await fetch(`${API_BASE}/trainings`, { headers: auth() })
      const d = await r.json()
      setTrainings(Array.isArray(d) ? d : (d.trainings || []))
    } catch (e) { console.error(e) }
  }

  const fetchFeedbacks = async () => {
    try {
      const r = await fetch(`${API_BASE}/feedback/admin-feedbacks`, { headers: auth() })
      const d = await r.json()
      setFeedbacks(d.feedbacks || [])
    } catch (e) { console.error(e) }
  }

  const fetchParticipants = async () => {
    try {
      const r = await fetch(`${API_BASE}/admin/participants`, { headers: auth() })
      const d = await r.json()
      setParticipants(d.participants || [])
    } catch (e) { console.error(e) }
  }

  const handleCreateTrainer = async (e) => {
    e.preventDefault()
    if (!trainerForm.name || !trainerForm.email || !trainerForm.password) {
      notify('All fields required', true)
      return
    }
    
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/create-trainer`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify(trainerForm)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      setTrainerForm({ name: '', email: '', password: '' })
      await fetchTrainers()
      notify('✅ Trainer created successfully')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTraining = async (e) => {
    e.preventDefault()
    if (!trainingForm.title || !trainingForm.trainerId) {
      notify('Title and Trainer required', true)
      return
    }
    
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/trainings`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({
          ...trainingForm,
          trainerId: parseInt(trainingForm.trainerId),
          capacity: trainingForm.capacity ? parseInt(trainingForm.capacity) : null
        })
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      setTrainingForm({ title: '', description: '', trainerId: '', startDate: '', endDate: '', capacity: '' })
      await fetchTrainings()
      notify('✅ Training created successfully')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveParticipant = async (id) => {
    if (!window.confirm('Approve this participant?')) return
    
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/approve-participant/${id}`, {
        method: 'POST',
        headers: auth()
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      await fetchPendingParticipants()
      await fetchParticipants()
      notify('✅ Participant approved')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectParticipant = async (id) => {
    if (!window.confirm('Reject and delete this participant?')) return
    
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/reject-participant/${id}`, {
        method: 'POST',
        headers: auth()
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      await fetchPendingParticipants()
      notify('✅ Participant rejected')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteParticipant = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/participants/${id}`, {
        method: 'DELETE',
        headers: auth()
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      await fetchParticipants()
      notify('✅ Participant deleted')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTraining = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/admin/trainings/${id}`, {
        method: 'DELETE',
        headers: auth()
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      
      await fetchTrainings()
      notify('✅ Training deleted')
    } catch (e) {
      notify(e.message, true)
    } finally {
      setLoading(false)
    }
  }

  // UI Components
  const TabButton = ({ key, label, active }) => (
    <button
      onClick={() => setTab(key)}
      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  )

  const StatCard = ({ icon, label, value, color = 'indigo' }) => (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 p-6 rounded-xl shadow-lg border-l-4 border-${color}-500`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-semibold">{label}</p>
          <p className={`text-3xl font-bold text-${color}-700 mt-2`}>{value}</p>
        </div>
        <div className={`text-5xl text-${color}-300 opacity-50`}>{icon}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>
            <p className="text-indigo-100 text-sm mt-1">Learning Management System</p>
          </div>
          <button
            onClick={onLogout}
            className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Alerts */}
      {msg && (
        <div className="bg-green-500 text-white px-6 py-3 text-center font-semibold animate-pulse">
          {msg}
        </div>
      )}
      {err && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold animate-pulse">
          ❌ {err}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8 pb-6 border-b border-gray-700">
          <TabButton key="overview" label="📈 Overview" active={tab === 'overview'} />
          <TabButton key="trainers" label="👨‍🏫 Trainers" active={tab === 'trainers'} />
          <TabButton key="pending" label={`⏳ Pending (${pendingParticipants.length})`} active={tab === 'pending'} />
          <TabButton key="trainings" label="📚 Trainings" active={tab === 'trainings'} />
          <TabButton key="participants" label="👥 Participants" active={tab === 'participants'} />
          <TabButton key="feedback" label="⭐ Feedback" active={tab === 'feedback'} />
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon="👥" label="Total Trainers" value={stats.totalTrainers || 0} color="blue" />
              <StatCard icon="🎓" label="Total Participants" value={stats.totalParticipants || 0} color="green" />
              <StatCard icon="📚" label="Total Trainings" value={stats.totalTrainings || 0} color="purple" />
              <StatCard icon="⭐" label="Avg Rating" value={stats.satisfactionScore || 0} color="yellow" />
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Training */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
                <h3 className="text-xl font-bold mb-4 text-purple-400">📚 Create Training</h3>
                <form onSubmit={handleCreateTraining} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Title"
                    value={trainingForm.title}
                    onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-400 outline-none transition"
                  />
                  <select
                    value={trainingForm.trainerId}
                    onChange={(e) => setTrainingForm({ ...trainingForm, trainerId: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-400 outline-none transition"
                  >
                    <option value="">Select Trainer</option>
                    {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input
                    type="datetime-local"
                    value={trainingForm.startDate}
                    onChange={(e) => setTrainingForm({ ...trainingForm, startDate: e.target.value })}
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-400 outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {loading ? '⏳ Creating...' : '✅ Create Training'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TRAINERS TAB */}
        {tab === 'trainers' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-gray-900">
            <TrainerManagement 
              trainers={trainers}
              onCreateTrainer={async (form) => {
                const r = await fetch(`${API_BASE}/admin/create-trainer`, {
                  method: 'POST',
                  headers: auth(),
                  body: JSON.stringify(form)
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                await fetchTrainers();
                fetchStats();
              }}
              onDeleteTrainer={async (id, name) => {
                if (!window.confirm(`Delete trainer "${name}"?`)) return;
                const r = await fetch(`${API_BASE}/admin/trainers/${id}`, {
                  method: 'DELETE',
                  headers: auth()
                });
                if (r.ok) {
                  await fetchTrainers();
                  fetchStats();
                } else {
                  const d = await r.json();
                  throw new Error(d.error);
                }
              }}
              loading={loading}
            />
          </div>
        )}

        {/* PENDING PARTICIPANTS TAB */}
        {tab === 'pending' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">⏳ Pending Participant Approvals</h2>
            {pendingParticipants.length === 0 ? (
              <p className="text-gray-400 text-center py-8">✅ No pending approvals</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Applied</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingParticipants.map(p => (
                      <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700 transition">
                        <td className="px-4 py-3 font-semibold">{p.name}</td>
                        <td className="px-4 py-3">{p.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{fmtDate(p.appliedAt)}</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleApproveParticipant(p.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleRejectParticipant(p.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition"
                          >
                            ❌ Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PARTICIPANTS TAB */}
        {tab === 'participants' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">👥 Approved Participants</h2>
            {participants.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No participants yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map(p => (
                      <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700 transition">
                        <td className="px-4 py-3 font-semibold">{p.name}</td>
                        <td className="px-4 py-3">{p.email}</td>
                        <td className="px-4 py-3">{p.phone || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteParticipant(p.id, p.name)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TRAININGS TAB */}
        {tab === 'trainings' && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-purple-400">📚 All Trainings</h2>
            {trainings.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No trainings yet</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {trainings.map(t => (
                  <div key={t.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-purple-500 transition">
                    <h4 className="font-bold text-lg mb-2">{t.title}</h4>
                    <p className="text-gray-300 text-sm mb-3">{t.description}</p>
                    <div className="text-sm text-gray-400 space-y-1 mb-3">
                      <p>📅 {fmtDate(t.startDate)} to {fmtDate(t.endDate)}</p>
                      <p>👥 Capacity: {t.capacity || 'Unlimited'}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteTraining(t.id, t.title)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {tab === 'feedback' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <StatCard icon="⭐" label="Total Responses" value={feedbacks.length} color="yellow" />
              <StatCard icon="👨‍🏫" label="Avg Trainer Rating" value={feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.trainerRating, 0) / feedbacks.length).toFixed(1) : '-'} color="blue" />
              <StatCard icon="📖" label="Avg Subject Rating" value={feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.subjectRating, 0) / feedbacks.length).toFixed(1) : '-'} color="green" />
            </div>

            {/* Feedback Table */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl">
              {feedbacks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No feedback yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-700">
                        <th className="px-4 py-3 text-left">Training</th>
                        <th className="px-4 py-3 text-left">Participant</th>
                        <th className="px-4 py-3 text-center">Trainer ⭐</th>
                        <th className="px-4 py-3 text-center">Subject ⭐</th>
                        <th className="px-4 py-3 text-left">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map(f => (
                        <tr key={f.id} className="border-b border-gray-700 hover:bg-gray-700 transition">
                          <td className="px-4 py-3 font-semibold">{f.trainingTitle}</td>
                          <td className="px-4 py-3">{f.participantName}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Stars v={f.trainerRating} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Stars v={f.subjectRating} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{f.comments ? f.comments.substring(0, 40) + '...' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
