import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UploadCloud, X, FileUp, Link as LinkIcon, AlertCircle, CheckCircle2,
} from 'lucide-react'
import {
  formatFileSize, getFileMeta, getExtension, MAX_UPLOAD_BYTES,
} from '../../../utils/fileTypes'

const ACCEPTED_EXT = [
  'pdf','doc','docx','odt','rtf','txt','md',
  'xls','xlsx','csv','ods',
  'ppt','pptx','odp',
  'jpg','jpeg','png','gif','webp','bmp','svg',
  'mp4','webm','mov','mkv','avi','m4v',
  'mp3','wav','m4a','ogg',
  'zip','rar','7z',
]
const ACCEPT_ATTR = ACCEPTED_EXT.map((e) => `.${e}`).join(',')

/**
 * ResourceUploader
 * ───────────────────────────────────────────────────────────────────────
 * Drag-and-drop uploader with title/description/training selector.
 * Either a file OR an external link is required.
 * Shows a live progress bar via the parent's onUpload(...) callback,
 * which is expected to return a promise and accept onProgress.
 *
 * Props:
 *   trainings    [{id,title}]   — for the optional training dropdown
 *   onUpload({ formData, onProgress }) — called when user clicks Upload
 *   onSuccess(note?)             — called after successful upload (for toast)
 *   onError(message)             — called on validation/server error
 */
export default function ResourceUploader({ trainings = [], onUpload, onSuccess, onError }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', link: '', trainingId: '' })
  const [progress, setProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState('')

  /* Cleanup any object URL we created */
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const accept = useCallback((picked) => {
    setValidationError('')
    if (!picked) return

    if (picked.size > MAX_UPLOAD_BYTES) {
      setValidationError(`File is too large. Max ${formatFileSize(MAX_UPLOAD_BYTES)}.`)
      return
    }
    const ext = getExtension(picked.name)
    if (!ACCEPTED_EXT.includes(ext)) {
      setValidationError(`"${ext}" files aren't supported.`)
      return
    }

    setFile(picked)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (picked.type.startsWith('image/') || picked.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(picked))
    } else {
      setPreviewUrl(null)
    }
    // Auto-fill title from filename if empty
    if (!form.title) {
      const base = picked.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
      setForm((p) => ({ ...p, title: base.slice(0, 80) }))
    }
    // Picking a file clears any link
    if (form.link) setForm((p) => ({ ...p, link: '' }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.link, previewUrl])

  const onPick = (e) => {
    const f = e.target.files?.[0]
    accept(f)
    e.target.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) accept(f)
  }

  const clearFile = () => {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const reset = () => {
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setForm({ title: '', description: '', link: '', trainingId: '' })
    setProgress(0)
    setValidationError('')
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    if (submitting) return

    if (!form.title.trim()) {
      setValidationError('Title is required.')
      return
    }
    if (!file && !form.link.trim()) {
      setValidationError('Choose a file or paste a link.')
      return
    }
    setValidationError('')
    setSubmitting(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('title', form.title.trim())
    formData.append('description', form.description.trim())
    if (form.trainingId) formData.append('trainingId', form.trainingId)
    if (file) formData.append('file', file)
    else formData.append('link', form.link.trim())

    try {
      const note = await onUpload({
        formData,
        onProgress: ({ percent }) => setProgress(percent),
      })
      setProgress(100)
      onSuccess?.(note)
      reset()
    } catch (err) {
      onError?.(err.message || 'Upload failed')
    } finally {
      setTimeout(() => { setSubmitting(false); setProgress(0) }, 350)
    }
  }

  const fileMeta = file ? getFileMeta(file.name) : null
  const FileIcon = fileMeta?.icon

  return (
    <form onSubmit={submit} className="tr-notes__card" aria-busy={submitting}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div className="tr-notes__label">
            <FileUp size={13} /> File
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => !submitting && inputRef.current?.click()}
            onKeyDown={(e) => {
              if (!submitting && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault(); inputRef.current?.click()
              }
            }}
            onDragOver={(e) => { e.preventDefault(); if (!submitting) setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={
              'tr-notes__drop' +
              (dragging ? ' tr-notes__drop--dragging' : '') +
              (file ? ' tr-notes__drop--has-file' : '')
            }
            aria-label="Drag-and-drop file here, or click to choose"
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={onPick}
              hidden
              disabled={submitting}
            />

            {!file ? (
              <>
                <span className="tr-notes__drop-icon">
                  <UploadCloud size={22} />
                </span>
                <div>
                  <div className="tr-notes__drop-title">Drag & drop or click to upload</div>
                  <div className="tr-notes__drop-hint">
                    Max {formatFileSize(MAX_UPLOAD_BYTES)} · PDF, DOC, PPT, XLS, images, video, audio, ZIP
                  </div>
                </div>
                <div className="tr-notes__drop-formats">
                  <span>PDF</span><span>DOCX</span><span>PPTX</span><span>XLSX</span>
                  <span>PNG</span><span>MP4</span><span>ZIP</span>
                </div>
              </>
            ) : (
              <div className="tr-notes__file-row">
                <div
                  className="tr-notes__file-thumb"
                  style={{ background: fileMeta.bg, color: fileMeta.color }}
                >
                  {previewUrl && file.type.startsWith('image/') && (
                    <img src={previewUrl} alt="" />
                  )}
                  {previewUrl && file.type.startsWith('video/') && (
                    <video src={previewUrl} muted />
                  )}
                  {!previewUrl && FileIcon && <FileIcon size={22} />}
                </div>
                <div className="tr-notes__file-info">
                  <div className="tr-notes__file-name">{file.name}</div>
                  <div className="tr-notes__file-meta">
                    {fileMeta.label} · {formatFileSize(file.size)}
                  </div>
                </div>
                <button
                  type="button"
                  className="tr-notes__btn tr-notes__btn--ghost tr-notes__btn--sm"
                  onClick={(e) => { e.stopPropagation(); clearFile() }}
                  disabled={submitting}
                  aria-label="Remove selected file"
                >
                  <X size={14} /> Remove
                </button>
              </div>
            )}
          </div>

          {/* OR — external link */}
          <div style={{ marginTop: 12 }}>
            <div className="tr-notes__label" style={{ marginTop: 6 }}>
              <LinkIcon size={13} /> Or paste a link
            </div>
            <input
              type="url"
              className="tr-notes__input"
              placeholder="https://example.com/your-resource"
              value={form.link}
              disabled={!!file || submitting}
              onChange={(e) => {
                setForm((p) => ({ ...p, link: e.target.value }))
                if (e.target.value) clearFile()
              }}
            />
          </div>
        </div>

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
            placeholder="e.g. Module 1 — Intro slides"
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            disabled={submitting}
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
            placeholder="Optional context — what's inside, when to read it…"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            disabled={submitting}
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
              disabled={submitting}
            >
              <option value="">— General (no training) —</option>
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Errors */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.10)',
                color: '#b91c1c',
                fontSize: 12.5,
                border: '1px solid rgba(239,68,68,0.20)',
              }}
              role="alert"
            >
              <AlertCircle size={14} /> {validationError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        <AnimatePresence>
          {submitting && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--tn-text-muted, #64748b)' }}>
                <span>Uploading…</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {progress}%
                </span>
              </div>
              <div className="tr-notes__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="tr-notes__progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="tr-notes__btn"
            onClick={reset}
            disabled={submitting}
          >
            Reset
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="tr-notes__btn tr-notes__btn--primary"
            disabled={submitting || (!file && !form.link.trim()) || !form.title.trim()}
          >
            {submitting ? 'Uploading…' : <><CheckCircle2 size={14} /> Upload resource</>}
          </motion.button>
        </div>
      </div>
    </form>
  )
}
