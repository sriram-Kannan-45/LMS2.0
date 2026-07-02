import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Eye, Sparkles, Code, X, BookOpen,
} from 'lucide-react'
import { API } from '../../api/api'
import { useToast } from '../Toast'

const STATUS_BADGE = {
  DRAFT:     { bg: '#f1f5f9', fg: '#475569' },
  PUBLISHED: { bg: '#dcfce7', fg: '#15803d' },
  CLOSED:    { bg: '#fee2e2', fg: '#dc2626' },
}

function Badge({ value, map }) {
  const v = map[value] || map.DRAFT
  return (
    <span style={{
      display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, background: v.bg, color: v.fg,
      letterSpacing: 0.4, textTransform: 'uppercase',
    }}>{value}</span>
  )
}

function AICodingWizard({ user, courseId, onClose, onGenerated }) {
  const { success, error: showError } = useToast()
  const [promptText, setPromptText] = useState('')
  const [problemCount, setProblemCount] = useState(3)
  const [difficulty, setDifficulty] = useState('Medium')
  const [languages, setLanguages] = useState('javascript, python')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!promptText.trim()) { showError('Please enter a topic or prompt'); return }
    setGenerating(true)
    try {
      const r = await fetch(API.CODING.GENERATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          courseId,
          prompt: promptText.trim(),
          problemCount: parseInt(problemCount, 10),
          difficulty,
          languages: languages.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Generation failed')
      success('Coding assessment created successfully')
      onGenerated?.()
      onClose()
    } catch (err) { showError(err.message) }
    finally { setGenerating(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => !generating && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540,
          boxShadow: '0 25px 60px -10px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={lblTiny}>AI Coding Wizard</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Generate Coding Assessment with AI
            </div>
          </div>
          <button onClick={onClose} style={iconBtn('#f1f5f9', '#475569')}>
            <X size={16} />
          </button>
        </div>

        {generating ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, border: '4px solid #f3f3f3',
              borderTop: '4px solid #4f46e5', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginTop: 8 }}>
              AI is crafting your coding assessment...
            </div>
            <div style={{ fontSize: 13, color: '#64748b', maxWidth: 360 }}>
              Generating problems with test cases and solutions. This may take up to 60 seconds.
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerate} style={{ padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...lblStyle, marginTop: 0 }}>Topic or Prompt <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. JavaScript array methods, Python data structures, etc."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', fontSize: 13 }}
                required
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Describe the coding topics or skills you want to assess.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ ...lblStyle, marginTop: 0 }}>Number of Problems</label>
                <select value={problemCount} onChange={(e) => setProblemCount(e.target.value)} style={inputStyle}>
                  {[1, 2, 3, 5, 7, 10].map(n => (
                    <option key={n} value={n}>{n} Problem{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ ...lblStyle, marginTop: 0 }}>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inputStyle}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ ...lblStyle, marginTop: 0 }}>Languages (comma-separated)</label>
              <input
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="e.g. javascript, python, java, cpp"
                style={inputStyle}
              />
            </div>

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              borderTop: '1px solid #e2e8f0', paddingTop: 16,
            }}>
              <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
              <button type="submit" style={{ ...btnPrimary, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                <Sparkles size={14} style={{ marginRight: 6 }} /> Generate Assessment
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function CourseCodingTab({ user, courseId, onCountChange }) {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const auth = () => ({ Authorization: `Bearer ${user.token}` })

  const fetchAll = async () => {
    try {
      setLoading(true)
      const r = await fetch(`${API.CODING.LIST}?courseId=${courseId}`, { headers: auth() })
      const d = await r.json()
      if (d.success) setAssessments(d.assessments || [])
    } catch (e) { showError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchAll() }, [courseId])

  const handleCreate = async () => {
    try {
      const r = await fetch(API.CODING.CREATE, {
        method: 'POST',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, trainingId: courseId }),
      })
      const d = await r.json()
      if (!r.ok || d.success === false) { showError(d.error || 'Creation failed'); return }
      success('Assessment created (DRAFT)')
      onCountChange?.()
      navigate(`/trainer/coding/${d.assessment?.id || d.id}`)
    } catch (e) { showError(e.message) }
  }

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete assessment "${a.title}"? This cannot be undone.`)) return
    try {
      const r = await fetch(API.CODING.DELETE(a.id), { method: 'DELETE', headers: auth() })
      const d = await r.json()
      if (!r.ok || d.success === false) { showError(d.message || d.error || 'Delete failed'); return }
      success('Assessment deleted')
      await fetchAll()
      onCountChange?.()
    } catch (e) { showError(e.message) }
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#0f172a' }}>
          {assessments.length} coding assessment{assessments.length !== 1 ? 's' : ''}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowWizard(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} /> Generate with AI
          </button>
          <button
            onClick={handleCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', background: '#fff', color: '#4f46e5',
              border: '1px solid #4f46e5', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Create Assessment
          </button>
        </div>
      </div>

      {/* Assessment table */}
      {loading ? (
        <div style={{ height: 240, background: '#f1f5f9', borderRadius: 10 }} />
      ) : assessments.length === 0 ? (
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 12,
        }}>
          <Code size={40} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: '0 0 6px', color: '#475569', fontWeight: 600 }}>No coding assessments yet</p>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
            Click <strong>Create Assessment</strong> to add the first one.
          </p>
        </div>
      ) : (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={th}>Title</th>
                <th style={th}>Problems</th>
                <th style={th}>Languages</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map(a => (
                <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{a.title || 'Untitled'}</div>
                  </td>
                  <td style={{ ...td, color: '#475569', fontSize: 13 }}>{a.problemCount ?? a.problems?.length ?? 0}</td>
                  <td style={{ ...td, fontSize: 12, color: '#64748b' }}>
                    {(a.languages || []).length > 0 ? a.languages.join(', ') : '—'}
                  </td>
                  <td style={td}><Badge value={a.status} map={STATUS_BADGE} /></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        title="View / Manage"
                        onClick={() => navigate(`/trainer/coding/${a.id}`)}
                        style={iconBtn('#e0e7ff', '#4338ca')}
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        title="Edit"
                        onClick={() => navigate(`/trainer/coding/${a.id}`)}
                        style={iconBtn('#eef2ff', '#4f46e5')}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDelete(a)}
                        style={iconBtn('#fee2e2', '#dc2626')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Wizard modal */}
      <AnimatePresence>
        {showWizard && (
          <AICodingWizard
            user={user}
            courseId={courseId}
            onClose={() => setShowWizard(false)}
            onGenerated={() => { fetchAll(); onCountChange?.() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── shared helpers ──
const lblStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569',
                   marginTop: 14, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
const lblTiny = { fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#fff',
}
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', padding: '10px 18px',
  background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecondary = {
  padding: '10px 18px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const iconBtn = (bg, fg) => ({
  width: 28, height: 28, border: 'none', cursor: 'pointer', borderRadius: 6,
  background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center',
})
const th = { padding: 12, textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569',
             textTransform: 'uppercase', letterSpacing: 0.5 }
const td = { padding: 12, verticalAlign: 'middle' }
