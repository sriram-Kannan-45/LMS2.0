import { motion } from 'framer-motion'
import {
  Eye, Pencil, Trash2, Download, ExternalLink, Calendar, BookOpen,
} from 'lucide-react'
import {
  formatFileSize, formatDate, getFileMeta, isExternalLink,
} from '../../../utils/fileTypes'
import { assetUrl } from '../../../api/api'

/**
 * ResourceCard — single trainer resource tile.
 * Click → preview · Hover → edit/delete actions reveal.
 *
 * Status badge reflects PENDING / APPROVED / REJECTED so trainers
 * always know whether the resource is visible to participants yet.
 */
export default function ResourceCard({
  note,
  index = 0,
  onPreview,
  onEdit,
  onDelete,
}) {
  const meta = getFileMeta(note)
  const Icon = meta.icon
  const showImageThumb = meta.category === 'image' && note.fileUrl && !isExternalLink(note)
  const showVideoThumb = meta.category === 'video' && note.fileUrl && !isExternalLink(note)
  const downloadHref = note.fileUrl ? (isExternalLink(note) ? note.fileUrl : assetUrl(note.fileUrl)) : null

  const handlePrimary = () => onPreview?.(note)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="tr-notes__resource"
    >
      {/* Status pill */}
      {note.status && (
        <span className={`tr-notes__resource-status tr-notes__resource-status--${note.status}`}>
          {note.status}
        </span>
      )}

      {/* Hover actions */}
      <div className="tr-notes__resource-actions">
        <button
          type="button"
          className="tr-notes__resource-action"
          onClick={(e) => { e.stopPropagation(); onPreview?.(note) }}
          aria-label="Preview"
          title="Preview"
        >
          <Eye size={14} />
        </button>
        <button
          type="button"
          className="tr-notes__resource-action"
          onClick={(e) => { e.stopPropagation(); onEdit?.(note) }}
          aria-label="Edit"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="tr-notes__resource-action tr-notes__resource-action--danger"
          onClick={(e) => { e.stopPropagation(); onDelete?.(note) }}
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Thumbnail */}
      <button
        type="button"
        onClick={handlePrimary}
        className="tr-notes__resource-thumb"
        style={{ border: 0, padding: 0, cursor: 'pointer', width: '100%' }}
        aria-label={`Open ${note.title}`}
      >
        {showImageThumb ? (
          <img src={assetUrl(note.fileUrl)} alt={note.title} loading="lazy" />
        ) : showVideoThumb ? (
          <video
            src={assetUrl(note.fileUrl) + '#t=0.5'}
            muted
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            className="tr-notes__resource-thumb-icon"
            style={{ background: meta.bg, color: meta.color }}
          >
            <Icon size={24} />
          </div>
        )}
      </button>

      {/* Body */}
      <div className="tr-notes__resource-body">
        <h4 className="tr-notes__resource-title" title={note.title}>{note.title}</h4>
        {note.description && (
          <p className="tr-notes__resource-desc" title={note.description}>
            {note.description}
          </p>
        )}

        <div className="tr-notes__resource-meta" style={{ marginTop: 'auto' }}>
          <span className="tr-notes__resource-tag" style={{ background: meta.bg, color: meta.color, borderColor: 'transparent' }}>
            {meta.label}
          </span>
          {note.fileSize ? <span>{formatFileSize(note.fileSize)}</span> : null}
          {note.training?.title && (
            <span title={note.training.title}>
              <BookOpen size={11} />
              {note.training.title.length > 16 ? note.training.title.slice(0, 16) + '…' : note.training.title}
            </span>
          )}
          {note.created_at && (
            <span>
              <Calendar size={11} />
              {formatDate(note.created_at)}
            </span>
          )}
          {downloadHref && (
            <a
              href={downloadHref}
              target={isExternalLink(note) ? '_blank' : '_self'}
              rel="noopener noreferrer"
              download={!isExternalLink(note)}
              onClick={(e) => e.stopPropagation()}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--tn-primary-600, #4f46e5)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              aria-label={isExternalLink(note) ? 'Open link' : 'Download file'}
            >
              {isExternalLink(note) ? <><ExternalLink size={11} /> Open</> : <><Download size={11} /> Download</>}
            </a>
          )}
        </div>
      </div>
    </motion.article>
  )
}
