import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, ExternalLink, Calendar, BookOpen, User as UserIcon,
} from 'lucide-react'
import { assetUrl } from '../../../api/api'
import {
  formatDate, formatFileSize, getFileMeta, isExternalLink, getFileCategory,
} from '../../../utils/fileTypes'

/**
 * ResourcePreviewModal — universal preview for any note/resource.
 *
 * Inline render rules:
 *   pdf      → <iframe>
 *   image    → <img>
 *   video    → <video controls>
 *   audio    → <audio controls> + decorative icon
 *   text/md  → fetched and shown in <pre>
 *   link     → "Open in new tab" CTA
 *   doc/ppt/sheet/archive/file → "Download" CTA + icon (browsers can't render
 *              Office docs natively without a viewer)
 *
 * Reusable across both trainer and participant views.
 */
export default function ResourcePreviewModal({ note, onClose }) {
  const [textContent, setTextContent] = useState(null)
  const [loadingText, setLoadingText] = useState(false)

  const meta = note ? getFileMeta(note) : null
  const Icon = meta?.icon
  const category = note ? getFileCategory(note) : 'file'
  const isExternal = note ? isExternalLink(note) : false
  const url = note?.fileUrl ? (isExternal ? note.fileUrl : assetUrl(note.fileUrl)) : null

  // Fetch text/markdown content for inline preview
  useEffect(() => {
    setTextContent(null)
    if (!note || !url || isExternal) return
    if (category !== 'text') return
    let cancelled = false
    setLoadingText(true)
    fetch(url)
      .then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((t) => { if (!cancelled) setTextContent(t.slice(0, 50000)) })
      .catch(() => { if (!cancelled) setTextContent(null) })
      .finally(() => { if (!cancelled) setLoadingText(false) })
    return () => { cancelled = true }
  }, [note, url, category, isExternal])

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!note) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [note, onClose])

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          key="bg"
          className="tr-notes__modal-bg"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            key="modal"
            className="tr-notes__modal tr-notes__modal--wide"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tn-preview-title"
          >
            <header className="tr-notes__modal-head">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                <span
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: meta?.bg, color: meta?.color, flexShrink: 0,
                  }}
                >
                  {Icon && <Icon size={20} />}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3
                    id="tn-preview-title"
                    style={{
                      margin: 0,
                      fontFamily: "'Outfit', system-ui, sans-serif",
                      fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {note.title}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--tn-text-muted, #64748b)' }}>
                    {meta?.label}
                    {note.fileSize ? ` · ${formatFileSize(note.fileSize)}` : ''}
                    {note.trainer?.name ? ` · ${note.trainer.name}` : ''}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                {url && (
                  <a
                    href={url}
                    target={isExternal ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    download={!isExternal}
                    className="tr-notes__btn tr-notes__btn--sm"
                  >
                    {isExternal ? <><ExternalLink size={13} /> Open</> : <><Download size={13} /> Download</>}
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="tr-notes__btn tr-notes__btn--ghost tr-notes__btn--sm"
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="tr-notes__modal-body" style={{ padding: 0, background: '#0b1120' }}>
              {!url ? (
                <FallbackPanel meta={meta} message="No file URL available" />
              ) : category === 'pdf' ? (
                <iframe
                  src={url}
                  title={note.title}
                  style={{ width: '100%', height: '78vh', border: 'none', background: '#fff' }}
                />
              ) : category === 'image' ? (
                <div style={{ background: '#0b1120', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <img
                    src={url}
                    alt={note.title}
                    style={{
                      maxWidth: '100%', maxHeight: '76vh',
                      borderRadius: 12, boxShadow: '0 18px 40px rgba(0,0,0,0.4)',
                    }}
                  />
                </div>
              ) : category === 'video' ? (
                <video
                  src={url}
                  controls
                  preload="metadata"
                  style={{ width: '100%', maxHeight: '78vh', background: '#000', display: 'block' }}
                >
                  Your browser doesn't support embedded video.
                </video>
              ) : category === 'audio' ? (
                <div style={{ padding: 32, background: 'var(--tn-bg, #fff)', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 64, height: 64, borderRadius: 16,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: meta.bg, color: meta.color,
                    }}
                  >
                    {Icon && <Icon size={28} />}
                  </span>
                  <audio src={url} controls style={{ width: '100%', maxWidth: 500 }} />
                </div>
              ) : category === 'text' ? (
                <div style={{ padding: 24, background: 'var(--tn-bg, #fff)', maxHeight: '78vh', overflow: 'auto' }}>
                  {loadingText && <p style={{ color: 'var(--tn-text-muted, #64748b)' }}>Loading…</p>}
                  {!loadingText && textContent != null && (
                    <pre style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--tn-text, #0f172a)',
                      margin: 0,
                    }}>
                      {textContent}
                    </pre>
                  )}
                  {!loadingText && textContent == null && (
                    <FallbackPanel meta={meta} message="Couldn't load text content. Use Download to read locally." downloadHref={url} />
                  )}
                </div>
              ) : category === 'link' ? (
                <FallbackPanel
                  meta={meta}
                  message="External link — opens in a new tab."
                  externalHref={url}
                  url={url}
                />
              ) : (
                <FallbackPanel
                  meta={meta}
                  message={`${meta.label} files cannot be previewed in the browser. Download the file to view it locally.`}
                  downloadHref={url}
                />
              )}
            </div>

            {(note.description || note.training?.title || note.trainer?.name || note.created_at) && (
              <footer
                style={{
                  padding: '14px 22px',
                  borderTop: '1px solid var(--tn-border-soft, #f1f5f9)',
                  fontSize: 13,
                  color: 'var(--tn-text-secondary, #475569)',
                  background: 'var(--tn-bg, #fff)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {note.description && (
                  <p style={{ margin: 0, lineHeight: 1.55 }}>{note.description}</p>
                )}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--tn-text-muted, #64748b)' }}>
                  {note.trainer?.name && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <UserIcon size={12} /> {note.trainer.name}
                    </span>
                  )}
                  {note.training?.title && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <BookOpen size={12} /> {note.training.title}
                    </span>
                  )}
                  {note.created_at && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {formatDate(note.created_at)}
                    </span>
                  )}
                </div>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FallbackPanel({ meta, message, downloadHref, externalHref, url }) {
  const Icon = meta?.icon
  return (
    <div
      style={{
        padding: 36, textAlign: 'center', minHeight: 300,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, background: 'var(--tn-bg, #fff)', color: 'var(--tn-text-secondary, #475569)',
      }}
    >
      <span
        style={{
          width: 72, height: 72, borderRadius: 18,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: meta?.bg, color: meta?.color,
        }}
      >
        {Icon && <Icon size={32} />}
      </span>
      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tn-text, #0f172a)' }}>
        {meta?.label || 'File'}
      </h4>
      <p style={{ margin: 0, fontSize: 13, maxWidth: 420 }}>{message}</p>
      {url && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--tn-text-muted, #64748b)', wordBreak: 'break-all', maxWidth: 480 }}>
          {url}
        </p>
      )}
      {downloadHref && (
        <a href={downloadHref} download className="tr-notes__btn tr-notes__btn--primary">
          <Download size={14} /> Download file
        </a>
      )}
      {externalHref && (
        <a href={externalHref} target="_blank" rel="noopener noreferrer" className="tr-notes__btn tr-notes__btn--primary">
          <ExternalLink size={14} /> Open in new tab
        </a>
      )}
    </div>
  )
}
