import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Settings, BookOpen, Users, BarChart3, Trophy, FileText, ListChecks,
  Plus, Pencil, Trash2, Save, X, Check, Send, Loader2, AlertTriangle, Eye, Star,
  Search, ChevronDown, ChevronUp, Clock, Calendar, User,
  HelpCircle, CheckCircle2, AlertCircle, RefreshCw, Monitor, Code, Terminal, Play,
} from 'lucide-react'
import { API } from '../api/api'
import { useToast } from '../components/Toast'
import CodeEditor from '../components/CodeEditor'

const STATUS_BADGE = {
  DRAFT:     { bg: '#f1f5f9', fg: '#475569', label: 'Draft' },
  PUBLISHED: { bg: '#dcfce7', fg: '#15803d', label: 'Published' },
  CLOSED:    { bg: '#fee2e2', fg: '#dc2626', label: 'Closed' },
  RESULTS_PUBLISHED: { bg: '#dbeafe', fg: '#1d4ed8', label: 'Results Published' },
  ARCHIVED:  { bg: '#f5f5f4', fg: '#78716c', label: 'Archived' },
}

const RESULT_STATUS_BADGE = {
  HIDDEN:  { bg: '#fef3c7', fg: '#92400e', label: 'Hidden' },
  PUBLISHED: { bg: '#dcfce7', fg: '#15803d', label: 'Published' },
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
]

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', background: '#4f46e5', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSuccess = { ...btnPrimary, background: '#059669' }
const btnDanger = { ...btnPrimary, background: '#dc2626' }
const btnWarning = { ...btnPrimary, background: '#d97706' }
const btnOutline = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', background: '#fff', color: '#475569',
  border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const iconBtn = (bg, fg) => ({
  width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6,
  background: bg, color: fg, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', flexShrink: 0,
})
const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
  fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff',
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const textareaStyle = { ...inputStyle, minHeight: 80, resize: 'vertical' }
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
const th = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #e2e8f0' }
const td = { padding: '10px 12px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9', fontSize: 13 }

export default function TrainerCodingAssessmentDetails({ user, onLogout }) {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const auth = () => ({ Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' })

  const [assessment, setAssessment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [publishing, setPublishing] = useState(false)

  const fetchAssessment = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(API.CODING.DETAIL(assessmentId), { headers: auth() })
      const d = await r.json()
      if (d.assessment) setAssessment(d.assessment)
      else toast.error('Assessment not found')
    } catch (e) {
      toast.error('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => { fetchAssessment() }, [fetchAssessment])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const r = await fetch(API.CODING.PUBLISH(assessmentId), { method: 'POST', headers: auth() })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Publish failed')
      toast.success('Assessment published')
      fetchAssessment()
    } catch (e) { toast.error(e.message) }
    finally { setPublishing(false) }
  }

  const handleClose = async () => {
    if (!confirm('Close this assessment? Participants will no longer be able to submit.')) return
    try {
      const r = await fetch(API.CODING.CLOSE(assessmentId), { method: 'POST', headers: auth() })
      if (!r.ok) throw new Error('Close failed')
      toast.success('Assessment closed')
      fetchAssessment()
    } catch (e) { toast.error(e.message) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this assessment permanently? This cannot be undone.')) return
    try {
      const r = await fetch(API.CODING.DELETE(assessmentId), { method: 'DELETE', headers: auth() })
      if (!r.ok) throw new Error('Delete failed')
      toast.success('Assessment deleted')
      navigate(-1)
    } catch (e) { toast.error(e.message) }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        Loading assessment…
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
        <AlertCircle size={24} style={{ margin: '0 auto 12px' }} />
        Coding assessment not found
      </div>
    )
  }

  const statusV = STATUS_BADGE[assessment.status] || STATUS_BADGE.DRAFT
  const resultV = RESULT_STATUS_BADGE[assessment.resultStatus] || RESULT_STATUS_BADGE.HIDDEN

  const tabs = [
    { key: 'general',    label: 'General',    icon: FileText },
    { key: 'problems',   label: 'Problems',   icon: Code },
    { key: 'participants', label: 'Participants', icon: Users },
    ...(assessment.status !== 'DRAFT' ? [{ key: 'results', label: 'Results', icon: BarChart3 }] : []),
    ...(assessment.status !== 'DRAFT' ? [{ key: 'leaderboard', label: 'Leaderboard', icon: Trophy }] : []),
    ...(assessment.status !== 'DRAFT' ? [{ key: 'analytics', label: 'Analytics', icon: Star }] : []),
    { key: 'settings',   label: 'Settings',   icon: Settings },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={iconBtn('#f1f5f9', '#475569')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{assessment.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: statusV.bg, color: statusV.fg }}>{statusV.label}</span>
            <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: resultV.bg, color: resultV.fg }}>Results: {resultV.label}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{assessment.problems?.length || 0} problems</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{assessment.languages?.length || 1} language(s)</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{assessment.timeLimit || 60} min</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e2e8f0', marginBottom: 24, overflow: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#4f46e5' : '#64748b',
                background: 'transparent',
                borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
                marginBottom: -2, whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'general' && (
            <GeneralTab assessment={assessment} onPublish={handlePublish} onClose={handleClose} onDelete={handleDelete} publishing={publishing} onRefresh={fetchAssessment} auth={auth} toast={toast} />
          )}
          {activeTab === 'problems' && (
            <ProblemsTab assessment={assessment} onRefresh={fetchAssessment} auth={auth} toast={toast} />
          )}
          {activeTab === 'participants' && (
            <ParticipantsTab assessment={assessment} auth={auth} toast={toast} />
          )}
          {activeTab === 'results' && (
            <ResultsTab assessment={assessment} auth={auth} toast={toast} onRefresh={fetchAssessment} />
          )}
          {activeTab === 'leaderboard' && (
            <LeaderboardTab assessment={assessment} auth={auth} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab assessment={assessment} auth={auth} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab assessment={assessment} onRefresh={fetchAssessment} auth={auth} toast={toast} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// GENERAL TAB
// ════════════════════════════════════════════════════════════════════════════
function GeneralTab({ assessment, onPublish, onClose, onDelete, publishing, onRefresh, auth, toast }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: assessment.title, description: assessment.description || '',
    timeLimit: assessment.timeLimit || 60, languages: assessment.languages || ['javascript'],
  })

  const handleSave = async () => {
    try {
      const r = await fetch(API.CODING.UPDATE(assessment.id), {
        method: 'PUT', headers: auth(),
        body: JSON.stringify(form)
      })
      if (!r.ok) throw new Error('Save failed')
      toast.success('Assessment updated')
      setEditing(false)
      onRefresh()
    } catch (e) { toast.error(e.message) }
  }

  const meta = [
    { label: 'Problems', value: assessment.problems?.length || 0 },
    { label: 'Duration', value: `${assessment.timeLimit || 60} minutes` },
    { label: 'Languages', value: (assessment.languages || ['javascript']).join(', ') },
    { label: 'Attempts Allowed', value: assessment.maxAttempts || 1 },
    { label: 'Total Marks', value: assessment.totalMarks || '—' },
    { label: 'Created', value: assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : '—' },
    { label: 'Difficulty', value: assessment.difficulty || 'MEDIUM' },
    { label: 'Participants', value: assessment.participantCount || '—' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setEditing(!editing)} style={btnOutline}>
          <Pencil size={14} /> {editing ? 'Cancel' : 'Edit'}
        </button>
        {assessment.status === 'DRAFT' && (
          <button onClick={onPublish} disabled={publishing} style={{ ...btnSuccess, opacity: publishing ? 0.6 : 1 }}>
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {publishing ? 'Publishing…' : 'Publish Assessment'}
          </button>
        )}
        {assessment.status === 'PUBLISHED' && (
          <button onClick={onClose} style={btnWarning}>
            <X size={14} /> Close Assessment
          </button>
        )}
        {assessment.status === 'CLOSED' && (
          <span style={{ ...btnPrimary, opacity: 0.7, cursor: 'default', background: '#64748b' }}>
            Closed
          </span>
        )}
        <button onClick={onDelete} style={btnDanger}>
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {editing ? (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Edit Assessment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Time Limit (minutes)</label>
              <input style={inputStyle} type="number" min={1} value={form.timeLimit} onChange={e => setForm({ ...form, timeLimit: parseInt(e.target.value) || 60 })} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Description</label>
              <textarea style={textareaStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Allowed Languages</label>
              <select style={selectStyle} multiple size={4} value={form.languages} onChange={e => {
                const opts = [...e.target.options].filter(o => o.selected).map(o => o.value)
                setForm({ ...form, languages: opts.length ? opts : form.languages })
              }}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleSave} style={btnPrimary}><Save size={14} /> Save Changes</button>
            <button onClick={() => setEditing(false)} style={btnOutline}>Cancel</button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {meta.map(m => (
          <div key={m.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PROBLEMS TAB
// ════════════════════════════════════════════════════════════════════════════
function ProblemsTab({ assessment, onRefresh, auth, toast }) {
  const [problems, setProblems] = useState(assessment.problems || [])
  const [showForm, setShowForm] = useState(false)
  const [editP, setEditP] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const loadProblems = async () => {
    try {
      const r = await fetch(API.CODING.DETAIL(assessment.id), { headers: auth() })
      const d = await r.json()
      if (d.assessment) setProblems(d.assessment.problems || [])
    } catch {}
  }

  const handleDelete = async (problemId) => {
    if (!confirm('Delete this problem?')) return
    try {
      const r = await fetch(API.CODING.DELETE_PROBLEM(problemId), { method: 'DELETE', headers: auth() })
      if (!r.ok) throw new Error('Delete failed')
      toast.success('Problem deleted')
      loadProblems()
    } catch (e) { toast.error(e.message) }
  }

  const handleSaveProblem = async (data) => {
    setSaving(true)
    try {
      const isEdit = !!editP
      const url = isEdit ? API.CODING.UPDATE_PROBLEM(editP.id) : API.CODING.CREATE_PROBLEM(assessment.id)
      const r = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: auth(),
        body: JSON.stringify(data)
      })
      if (!r.ok) throw new Error('Save failed')
      toast.success(isEdit ? 'Problem updated' : 'Problem added')
      setShowForm(false)
      setEditP(null)
      loadProblems()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const DIFF_BADGE = {
    EASY:   { bg: '#dcfce7', fg: '#15803d' },
    MEDIUM: { bg: '#fef3c7', fg: '#92400e' },
    HARD:   { bg: '#fee2e2', fg: '#dc2626' },
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{problems.length} Problems</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAI(true)} style={btnOutline}>
            <Star size={14} /> AI Generate
          </button>
          <button onClick={() => { setEditP(null); setShowForm(true) }} style={btnPrimary}>
            <Plus size={14} /> Add Problem
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(showForm || editP) && (
          <ProblemForm
            problem={editP}
            assessmentLanguages={assessment.languages || ['javascript']}
            onSave={handleSaveProblem}
            onClose={() => { setShowForm(false); setEditP(null) }}
            saving={saving}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAI && (
          <AICodingWizard
            assessmentId={assessment.id}
            onClose={() => setShowAI(false)}
            onComplete={() => { setShowAI(false); loadProblems() }}
            auth={auth}
            toast={toast}
          />
        )}
      </AnimatePresence>

      {problems.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
          <Code size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No problems yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Add a problem or generate with AI</div>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...th, width: 40 }}>#</th>
                <th style={th}>Title</th>
                <th style={th}>Language</th>
                <th style={th}>Difficulty</th>
                <th style={{ ...th, width: 60, textAlign: 'center' }}>Marks</th>
                <th style={{ ...th, width: 80, textAlign: 'center' }}>Tests</th>
                <th style={{ ...th, width: 100, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p, i) => {
                const db = DIFF_BADGE[p.difficulty] || DIFF_BADGE.MEDIUM
                return (
                  <tr key={p.id || i}>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{p.title}</td>
                    <td style={td}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{p.programmingLanguage || 'javascript'}</span></td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: db.bg, color: db.fg }}>
                        {p.difficulty || 'MEDIUM'}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#475569' }}>{p.marks || 10}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{p.testCases?.length || 0}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => { setEditP(p); setShowForm(true) }} style={iconBtn('#e0e7ff', '#4338ca')} title="Edit"><Pencil size={12} /></button>
                        <button onClick={() => handleDelete(p.id)} style={iconBtn('#fee2e2', '#dc2626')} title="Delete"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Problem Form ─────────────────────────────────────────────────────────
function ProblemForm({ problem, assessmentLanguages, onSave, onClose, saving }) {
  const isEdit = !!problem
  const testCases = problem?.testCases || []
  const [form, setForm] = useState({
    title: problem?.title || '',
    statement: problem?.statement || '',
    inputFormat: problem?.inputFormat || '',
    outputFormat: problem?.outputFormat || '',
    constraints: problem?.constraints || '',
    programmingLanguage: problem?.programmingLanguage || (assessmentLanguages[0] || 'javascript'),
    starterCode: problem?.starterCode || '',
    expectedSolution: problem?.expectedSolution || '',
    timeLimit: problem?.timeLimit || 5,
    memoryLimit: problem?.memoryLimit || 256,
    difficulty: problem?.difficulty || 'MEDIUM',
    marks: problem?.marks || 10,
    testCases: testCases.length ? testCases : [{ input: '', expectedOutput: '', isHidden: false }],
  })

  const updateTC = (i, field, value) => {
    const tcs = [...form.testCases]
    tcs[i] = { ...tcs[i], [field]: value }
    setForm({ ...form, testCases: tcs })
  }

  const addTC = () => setForm({ ...form, testCases: [...form.testCases, { input: '', expectedOutput: '', isHidden: false }] })
  const removeTC = (i) => setForm({ ...form, testCases: form.testCases.filter((_, j) => j !== i) })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      testCases: form.testCases.filter(tc => tc.input || tc.expectedOutput),
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            {isEdit ? 'Edit Problem' : 'Add Problem'}
          </h3>
          <button onClick={onClose} style={iconBtn('#f1f5f9', '#475569')}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Language</label>
              <select style={selectStyle} value={form.programmingLanguage} onChange={e => setForm({ ...form, programmingLanguage: e.target.value })}>
                {LANGUAGES.filter(l => assessmentLanguages.includes(l.value)).map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select style={selectStyle} value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Marks</label>
              <input style={inputStyle} type="number" min={1} value={form.marks} onChange={e => setForm({ ...form, marks: parseInt(e.target.value) || 10 })} />
            </div>
            <div>
              <label style={labelStyle}>Time Limit (seconds)</label>
              <input style={inputStyle} type="number" min={1} value={form.timeLimit} onChange={e => setForm({ ...form, timeLimit: parseInt(e.target.value) || 5 })} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Problem Statement *</label>
            <textarea style={textareaStyle} required value={form.statement} onChange={e => setForm({ ...form, statement: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Input Format</label>
              <textarea style={textareaStyle} value={form.inputFormat} onChange={e => setForm({ ...form, inputFormat: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Output Format</label>
              <textarea style={textareaStyle} value={form.outputFormat} onChange={e => setForm({ ...form, outputFormat: e.target.value })} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Constraints</label>
            <textarea style={textareaStyle} value={form.constraints} onChange={e => setForm({ ...form, constraints: e.target.value })} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Starter Code</label>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
              <CodeEditor
                value={form.starterCode}
                language={form.programmingLanguage}
                onChange={v => setForm({ ...form, starterCode: v || '' })}
                height="150px"
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Expected Solution (hidden from participants)</label>
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
              <CodeEditor
                value={form.expectedSolution}
                language={form.programmingLanguage}
                onChange={v => setForm({ ...form, expectedSolution: v || '' })}
                height="150px"
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Test Cases</label>
              <button type="button" onClick={addTC} style={{ ...btnOutline, fontSize: 11, padding: '4px 12px' }}>
                <Plus size={11} /> Add Test Case
              </button>
            </div>
            {form.testCases.map((tc, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input style={inputStyle} placeholder="Input" value={tc.input} onChange={e => updateTC(i, 'input', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <input style={inputStyle} placeholder="Expected Output" value={tc.expectedOutput} onChange={e => updateTC(i, 'expectedOutput', e.target.value)} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', marginTop: 9 }}>
                  <input type="checkbox" checked={tc.isHidden} onChange={e => updateTC(i, 'isHidden', e.target.checked)} />
                  Hidden
                </label>
                <button type="button" onClick={() => removeTC(i)} style={{ ...iconBtn('#fee2e2', '#dc2626'), marginTop: 5 }}><X size={10} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <button type="button" onClick={onClose} style={btnOutline}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isEdit ? 'Update' : 'Add'} Problem
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── AI Coding Wizard ─────────────────────────────────────────────────────
function AICodingWizard({ assessmentId, onClose, onComplete, auth, toast }) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast.error('Please enter a topic or description')
    setGenerating(true)
    try {
      const r = await fetch(API.CODING.GENERATE, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ prompt, assessmentId, numProblems: 3 }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Generation failed')
      toast.success(`Generated ${d.problems?.length || 0} problems`)
      onComplete()
    } catch (e) { toast.error(e.message) }
    finally { setGenerating(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            <Star size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: '#f59e0b' }} />
            AI Generate Coding Problems
          </h3>
          <button onClick={onClose} style={iconBtn('#f1f5f9', '#475569')}><X size={14} /></button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Describe the problems you want to generate</label>
          <textarea
            style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }}
            placeholder="e.g. Create 3 problems about binary search trees. Include easy, medium, and hard difficulty. Each problem should have starter code and test cases."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
          <button onClick={handleGenerate} disabled={generating} style={{ ...btnPrimary, opacity: generating ? 0.6 : 1 }}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
            {generating ? 'Generating…' : 'Generate Problems'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PARTICIPANTS TAB
// ════════════════════════════════════════════════════════════════════════════
function ParticipantsTab({ assessment, auth, toast }) {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API.CODING.PARTICIPANTS(assessment.id), { headers: auth() })
        const d = await r.json()
        setParticipants(d.participants || [])
      } catch {} finally { setLoading(false) }
    })()
  }, [])

  const ATTEMPT_STATUS = {
    NOT_STARTED: { bg: '#f1f5f9', fg: '#64748b', label: 'Not Started' },
    IN_PROGRESS: { bg: '#dbeafe', fg: '#1d4ed8', label: 'In Progress' },
    SUBMITTED: { bg: '#dcfce7', fg: '#15803d', label: 'Submitted' },
    DISQUALIFIED: { bg: '#fee2e2', fg: '#dc2626', label: 'Disqualified' },
  }

  const filtered = participants.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{participants.length} Participants</h3>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
          <input style={{ ...inputStyle, paddingLeft: 30, width: 240 }} placeholder="Search participants…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><Loader2 size={20} className="animate-spin" /></div>
      ) : participants.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
          <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No participants yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Participants will appear once they start the assessment</div>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'center' }}>Violations</th>
                <th style={{ ...th, textAlign: 'center' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = ATTEMPT_STATUS[p.status] || ATTEMPT_STATUS.NOT_STARTED
                return (
                  <tr key={p.id}>
                    <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{p.name || '—'}</td>
                    <td style={td}>{p.email || '—'}</td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: st.bg, color: st.fg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: (p.violationCount || 0) > 3 ? '#dc2626' : '#64748b' }}>
                        {p.violationCount || 0}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{p.score ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// RESULTS TAB
// ════════════════════════════════════════════════════════════════════════════
function ResultsTab({ assessment, auth, toast, onRefresh }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedResult, setSelectedResult] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API.CODING.RESULTS(assessment.id), { headers: auth() })
        const d = await r.json()
        setResults(d.results || [])
      } catch {} finally { setLoading(false) }
    })()
  }, [])

  const handlePublishResults = async () => {
    try {
      const r = await fetch(API.CODING.PUBLISH_RESULT(assessment.id), { method: 'POST', headers: auth() })
      if (!r.ok) {
        const d = await r.json()
        throw new Error(d.message || 'Publish failed')
      }
      toast.success('Results published')
      onRefresh?.()
    } catch (e) { toast.error(e.message) }
  }

  const handleHideResults = async () => {
    try {
      const r = await fetch(API.CODING.HIDE_RESULT(assessment.id), { method: 'POST', headers: auth() })
      if (!r.ok) throw new Error('Hide results failed')
      toast.success('Results hidden')
      onRefresh?.()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{results.length} Results</h3>
        {assessment.resultStatus === 'HIDDEN' && results.length > 0 && (
          <button onClick={handlePublishResults} style={btnSuccess}>
            <Send size={14} /> Publish All Results
          </button>
        )}
        {assessment.resultStatus === 'PUBLISHED' && results.length > 0 && (
          <button onClick={handleHideResults} style={btnDanger}>
            <X size={14} /> Hide Results
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><Loader2 size={20} className="animate-spin" /></div>
      ) : results.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
          <BarChart3 size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No results yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Results will appear after participants submit</div>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>Participant</th>
                <th style={{ ...th, textAlign: 'center' }}>Score</th>
                <th style={{ ...th, textAlign: 'center' }}>Max</th>
                <th style={{ ...th, textAlign: 'center' }}>%</th>
                <th style={{ ...th, textAlign: 'center' }}>Rank</th>
                <th style={{ ...th, textAlign: 'center' }}>Time</th>
                <th style={{ ...th, textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id || i}>
                  <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{r.participantName || r.participant?.name || `Participant #${r.participantId}`}</td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#059669' }}>{r.totalScore ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'center', color: '#475569' }}>{r.maxScore ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      background: (r.percentage || 0) >= 70 ? '#dcfce7' : (r.percentage || 0) >= 40 ? '#fef3c7' : '#fee2e2',
                      color: (r.percentage || 0) >= 70 ? '#15803d' : (r.percentage || 0) >= 40 ? '#92400e' : '#dc2626',
                    }}>
                      {r.percentage != null ? `${Math.round(r.percentage)}%` : '—'}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#475569' }}>{r.rank ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'center', fontSize: 12, color: '#64748b' }}>{r.timeTaken ? `${r.timeTaken}s` : '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button onClick={() => setSelectedResult(selectedResult?.id === r.id ? null : r)} style={btnOutline}>
                      <Eye size={12} /> {selectedResult?.id === r.id ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selectedResult && (
          <SubmissionDetail submission={selectedResult} onClose={() => setSelectedResult(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function SubmissionDetail({ submission, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ marginTop: 20, background: '#f8fafc', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Submission Details</h4>
        <button onClick={onClose} style={iconBtn('#f1f5f9', '#475569')}><X size={14} /></button>
      </div>
      {submission.submissions?.map((sub, i) => (
        <div key={i} style={{ marginBottom: 16, padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            Problem: {sub.problemTitle || `Problem #${sub.problemId || i + 1}`}
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Language</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{sub.language || 'javascript'}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Result</span>
              <div>
                <span style={{
                  padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: sub.allPassed ? '#dcfce7' : '#fee2e2',
                  color: sub.allPassed ? '#15803d' : '#dc2626',
                }}>
                  {sub.allPassed ? 'All Passed' : 'Some Failed'}
                </span>
              </div>
            </div>
          </div>
          {sub.testResults?.length > 0 && (
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>
                Test Results ({sub.passedTestCases || 0}/{sub.totalTestCases || sub.testResults.length})
              </span>
              {sub.testResults.map((tr, j) => (
                <div key={j} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 4,
                  borderRadius: 6, fontSize: 12, background: tr.passed ? '#f0fdf4' : '#fef2f2',
                }}>
                  {tr.passed ? <Check size={12} color="#16a34a" /> : <X size={12} color="#dc2626" />}
                  <span style={{ flex: 1, color: tr.passed ? '#15803d' : '#dc2626' }}>
                    {tr.isHidden ? 'Hidden Test' : `Test ${j + 1}`}
                    {!tr.isHidden && tr.input && <span style={{ color: '#64748b' }}> — Input: {tr.input}</span>}
                  </span>
                  {tr.executionTime != null && (
                    <span style={{ color: '#94a3b8', fontSize: 10 }}>{Number(tr.executionTime).toFixed(3)}s</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LEADERBOARD TAB
// ════════════════════════════════════════════════════════════════════════════
function LeaderboardTab({ assessment, auth }) {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API.CODING.LEADERBOARD(assessment.id), { headers: auth() })
        const d = await r.json()
        setLeaders(d.leaderboard || [])
      } catch {} finally { setLoading(false) }
    })()
  }, [])

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
        <Trophy size={16} style={{ marginRight: 8, verticalAlign: 'middle', color: '#f59e0b' }} />
        Leaderboard
      </h3>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><Loader2 size={20} className="animate-spin" /></div>
      ) : leaders.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
          <Trophy size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No rankings yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Results will appear after participants submit</div>
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...th, width: 60, textAlign: 'center' }}>Rank</th>
                <th style={th}>Participant</th>
                <th style={{ ...th, textAlign: 'center' }}>Score</th>
                <th style={{ ...th, textAlign: 'center' }}>Percentage</th>
                <th style={{ ...th, textAlign: 'center' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((l, i) => {
                const medal = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'transparent'
                const isMe = l.isCurrentParticipant
                return (
                  <tr key={l.id || i} style={{ background: isMe ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {i < 3 ? <Trophy size={16} color={medal} fill={medal} /> : <span style={{ fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>}
                    </td>
                    <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{l.participantName || l.name || `Participant #${l.participantId}`}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#059669' }}>{l.totalScore ?? l.score ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: (l.percentage || 0) >= 70 ? '#dcfce7' : (l.percentage || 0) >= 40 ? '#fef3c7' : '#fee2e2',
                        color: (l.percentage || 0) >= 70 ? '#15803d' : (l.percentage || 0) >= 40 ? '#92400e' : '#dc2626',
                      }}>
                        {l.percentage != null ? `${Math.round(l.percentage)}%` : '—'}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontSize: 12, color: '#64748b' }}>{l.timeTaken ? `${l.timeTaken}s` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ANALYTICS TAB
// ════════════════════════════════════════════════════════════════════════════
function AnalyticsTab({ assessment, auth }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API.CODING.ANALYTICS(assessment.id), { headers: auth() })
        const d = await r.json()
        setAnalytics(d)
      } catch {} finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}><Loader2 size={20} className="animate-spin" /></div>
  if (!analytics) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No analytics data available</div>

  const cards = [
    { label: 'Avg. Score', value: analytics.averageScore != null ? `${Math.round(analytics.averageScore)}%` : '—', color: '#4f46e5' },
    { label: 'Highest Score', value: analytics.highestScore != null ? `${Math.round(analytics.highestScore)}%` : '—', color: '#059669' },
    { label: 'Lowest Score', value: analytics.lowestScore != null ? `${Math.round(analytics.lowestScore)}%` : '—', color: '#dc2626' },
    { label: 'Total Attempts', value: analytics.totalAttempts || 0, color: '#0891b2' },
    { label: 'Avg. Time', value: analytics.averageTime ? `${Math.round(analytics.averageTime)}s` : '—', color: '#7c3aed' },
    { label: 'Pass Rate', value: analytics.passRate != null ? `${Math.round(analytics.passRate)}%` : '—', color: '#d97706' },
  ]

  return (
    <div>
      <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
        <BarChart3 size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Assessment Analytics
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
      {analytics.problemStats?.length > 0 && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>Problem</th>
                <th style={{ ...th, textAlign: 'center' }}>Difficulty</th>
                <th style={{ ...th, textAlign: 'center' }}>Avg. Score</th>
                <th style={{ ...th, textAlign: 'center' }}>Submissions</th>
                <th style={{ ...th, textAlign: 'center' }}>Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {analytics.problemStats.map((ps, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>{ps.title || `Problem ${i + 1}`}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: ps.difficulty === 'EASY' ? '#dcfce7' : ps.difficulty === 'HARD' ? '#fee2e2' : '#fef3c7',
                      color: ps.difficulty === 'EASY' ? '#15803d' : ps.difficulty === 'HARD' ? '#dc2626' : '#92400e',
                    }}>{ps.difficulty || 'MEDIUM'}</span>
                  </td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{ps.averageScore != null ? `${Math.round(ps.averageScore)}%` : '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{ps.totalSubmissions || 0}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: (ps.passRate || 0) >= 70 ? '#059669' : (ps.passRate || 0) >= 40 ? '#d97706' : '#dc2626' }}>
                      {ps.passRate != null ? `${Math.round(ps.passRate)}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ════════════════════════════════════════════════════════════════════════════
function SettingsTab({ assessment, onRefresh, auth, toast }) {
  const [form, setForm] = useState({
    maxAttempts: assessment.maxAttempts || 1,
    timeLimit: assessment.timeLimit || 60,
    proctoringEnabled: assessment.proctoringEnabled || false,
    fullscreenRequired: assessment.fullscreenRequired || false,
    shuffleProblems: assessment.shuffleProblems || false,
    languages: assessment.languages || ['javascript'],
    passingPercentage: assessment.passingPercentage || 50,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await fetch(API.CODING.UPDATE(assessment.id), {
        method: 'PUT', headers: auth(),
        body: JSON.stringify(form)
      })
      if (!r.ok) throw new Error('Save failed')
      toast.success('Settings saved')
      onRefresh()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
        <Settings size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Assessment Settings
      </h3>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, maxWidth: 600 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Max Attempts</label>
            <input style={inputStyle} type="number" min={1} max={10} value={form.maxAttempts} onChange={e => setForm({ ...form, maxAttempts: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <label style={labelStyle}>Time Limit (minutes)</label>
            <input style={inputStyle} type="number" min={5} value={form.timeLimit} onChange={e => setForm({ ...form, timeLimit: parseInt(e.target.value) || 60 })} />
          </div>
          <div>
            <label style={labelStyle}>Passing Percentage</label>
            <input style={inputStyle} type="number" min={0} max={100} value={form.passingPercentage} onChange={e => setForm({ ...form, passingPercentage: parseInt(e.target.value) || 50 })} />
          </div>
          <div>
            <label style={labelStyle}>Allowed Languages</label>
            <select style={selectStyle} multiple size={4} value={form.languages} onChange={e => {
              const opts = [...e.target.options].filter(o => o.selected).map(o => o.value)
              setForm({ ...form, languages: opts.length ? opts : form.languages })
            }}>
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.proctoringEnabled} onChange={e => setForm({ ...form, proctoringEnabled: e.target.checked })} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Enable Proctoring</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.fullscreenRequired} onChange={e => setForm({ ...form, fullscreenRequired: e.target.checked })} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Require Fullscreen</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.shuffleProblems} onChange={e => setForm({ ...form, shuffleProblems: e.target.checked })} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Shuffle Problems</span>
            </label>
          </div>
        </div>
        <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
