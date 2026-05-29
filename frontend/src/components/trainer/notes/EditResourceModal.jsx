import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Save, AlertCircle, FileUp, UploadCloud, Link as LinkIcon,
} from 'lucide-react'
import {
  formatFileSize, getFileMeta, getExtension, MAX_UPLOAD_BYTES,
} from '../../../utils/fileTypes'

/**
 * EditResourceModal
 * ───────────────────────────────────────────────────────────────────────
 * Lets a trainer edit a note's title, description, and linked training.
 * Optionally replace the file (or swap to/from a link).
 *
 * Replacing the file resets status to PENDING (matches backend).
 *
 * Props:
 *   open          — boolean
 *   note          — current note object
 *   trainings     — [{id,title}]
 *   onClose
 *   onSave({ formData, onProgress }) → Promise
 */
export default function EditResourceModal({
  open,
  note,
  trainings = [],
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({ title: '', description: '', link: '', trainingId: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  // Re-sync from note whenever modal opens
  useEffect(() => {
    if (!open) return
    setForm({
      title: note?.title || '',
      description: note?.description || '',
      link: '',
      trainingId: note?.trainingId ? String(note.trainingId) : '',
    })
    setFile(null)
    setError('')
    setProgress(0)
  }, [open, note])

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`File is too large. Max ${formatFileSize(MAX_UPLOAD_BYTES)}.`)
      return
    }
    setError('')
    setFile(f)
    setForm((p) => ({ ...p, link: '' }))
    e.target.value = ''
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    if (submitting) return
    if (!form.title.trim()) { setError('Title is required.'); return }

    const formData = new FormData()
    formData.append('title', form.title.trim())
    formData.append('description', form.description.trim())
    formData.append('trainingId', form.trainingId || '')
    if (file) {
      formData.append('file', file)
    } else if (form.link.trim()) {
      formData.append('link', form.link.trim())
    }

    setSubmitting(true)
    setProgress(0)
    try {
      await onSave({
        formData,
        onProgress: ({ percent }) => setProgress(percent),
      })
      onClose?.()
    } catch (err) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setTimeout(() => { setSubmitting(false); setProgress(0) }, 300)
    }
  }

  const newFileMeta = file ? getFileMeta(file.name) : null
  const FileIcon = newFileMeta?.icon

  return (
    <AnimatePresence>
      {open && note && (
        <motion.div
          key="bg"
          className="tr-notes__modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            key="modal"
            className="tr-notes__modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tn-edit-title"
            aria-busy={submitting}
          >
            <header className="tr-notes__modal-head">
              <div>
                <h3 id="tn-edit-title" style={{
                  margin: 0,
                  fontFamily: "'Outfit', system-ui, sans-serif",
                  fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em',
                }}>
                  Edit resource
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--tn-text-muted, #64748b)' }}>
                  Replacing the file will require admin re-approval.
                </p>
              </div>
              <button
                type="button"
                className="tr-notes__btn tr-notes__btn--ghost tr-notes__btn--sm"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>

            <div className="tr-notes__modal-body">
              {/* Title */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="tr-notes__label">Title *</span>
                  <span className="tr-notes__count">{form.title.length}/80</span>
                </div>
                <input
                  type="text"
                  className="tr-notes__input"
                  maxLength={80}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="tr-notes__label">Description</span>
                  <span className="tr-notes__count">{form.description.length}/280</span>
                </div>
                <textarea
                  className="tr-notes__textarea"
                  maxLength={280}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Training */}
              {trainings.length > 0 && (
                <div>
                  <span className="tr-notes__label">Linked training</span>
                  <select
                    className="tr-notes__select"
                    value={form.trainingId}
                    onChange={(e) => setForm((p) => ({ ...p, trainingId: e.target.value }))}
                  >
                    <option value="">— General (no training) —</option>
                    {trainings.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* File replacement */}
              <div>
                <span className="tr-notes__label"><FileUp size={13} /> Replace file (optional)</span>
                <label className={'tr-notes__drop' + (file ? ' tr-notes__drop--has-file' : '')} style={{ padding: 16 }}>
                  <input type="file" hidden onChange={handleFile} />
                  {!file ? (
                    <>
                      <span className="tr-notes__drop-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
                        <UploadCloud size={16} />
                      </span>
                      <div className="tr-notes__drop-title" style={{ fontSize: 13.5 }}>
                        Choose a new file
                      </div>
                      <div className="tr-notes__drop-hint">
                        Leave empty to keep the current file. Max {formatFileSize(MAX_UPLOAD_BYTES)}.
                      </div>
                    </>
                  ) : (
                    <div className="tr-notes__file-row">
                      <div
                        className="tr-notes__file-thumb"
                        style={{ background: newFileMeta.bg, color: newFileMeta.color, width: 44, height: 44, borderRadius: 10 }}
                      >
                        {FileIcon && <FileIcon size={18} />}
                      </div>
                      <div className="tr-notes__file-info">
                        <div className="tr-notes__file-name">{file.name}</div>
                        <div className="tr-notes__file-meta">
                          {newFileMeta.label} · {formatFileSize(file.size)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="tr-notes__btn tr-notes__btn--ghost tr-notes__btn--sm"
                        onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  )}
                </label>

                {/* Or swap to a link */}
                <div style={{ marginTop: 10 }}>
                  <span className="tr-notes__label"><LinkIcon size={13} /> Or replace with a link</span>
                  <input
                    type="url"
                    className="tr-notes__input"
                    placeholder="https://example.com/new-resource"
                    value={form.link}
                    disabled={!!file}
                    onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
                  />
                </div>
              </div>

              {/* Errors */}
              {error && (
                <div
                  role="alert"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px', borderRadius: 12,
                    background: 'rgba(239,68,68,0.10)',
                    border: '1px solid rgba(239,68,68,0.20)',
                    color: '#b91c1c',
                    fontSize: 12.5,
                  }}
                >
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Progress */}
              {submitting && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--tn-text-muted, #64748b)' }}>
                    <span>Saving…</span>
                    <span style={{ fontWeight: 700 }}>{progress}%</span>
                  </div>
                  <div className="tr-notes__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="tr-notes__progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            <footer className="tr-notes__modal-foot">
              <button type="button" className="tr-notes__btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="tr-notes__btn tr-notes__btn--primary" disabled={submitting || !form.title.trim()}>
                <Save size={14} /> Save changes
              </button>
            </footer>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
