import { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, ImagePlus, Loader2, Trash2, User } from 'lucide-react'
import { compressImage } from '../../../utils/compressImage'

/**
 * ProfileAvatar — Linear/Vercel SaaS spec (2026-05-28 v3).
 * 88px circle, 2px violet outline ring with 4px gap, white camera badge
 * always visible bottom-right, ghost "Upload photo" button below.
 *
 * Props:
 *   src         — current image URL (null/undefined ⇒ empty state)
 *   initials    — fallback letters when not editable and no image
 *   size        — px (default 88, per spec)
 *   editable    — show camera badge + buttons + click-to-upload
 *   onChange(file)  — fired with the compressed File after the user picks one
 *   onClear()       — fired when the user removes the photo
 *   alt              — accessible label
 */
export default function ProfileAvatar({
  src,
  initials = 'U',
  size = 88,
  editable = false,
  onChange,
  onClear,
  className = '',
  alt = 'Profile photo',
}) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const pickFile = useCallback(() => {
    if (editable) inputRef.current?.click()
  }, [editable])

  const handleFile = useCallback(
    async (file) => {
      if (!file) return
      if (!file.type?.startsWith('image/')) {
        setError('Please choose an image file (PNG, JPG, GIF, WEBP).')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image is too large. Max 10 MB.')
        return
      }
      setError('')
      setProcessing(true)
      try {
        const compact = await compressImage(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.85,
        })
        onChange?.(compact)
      } catch (err) {
        setError(err?.message || 'Could not process that image.')
      } finally {
        setProcessing(false)
      }
    },
    [onChange]
  )

  const dimension = { width: size, height: size }

  return (
    <div className={`pf-avatar-wrap ${className}`}>
      <motion.div
        whileHover={editable ? { scale: 1.02 } : undefined}
        whileTap={editable ? { scale: 0.98 } : undefined}
        onClick={pickFile}
        role={editable ? 'button' : 'img'}
        tabIndex={editable ? 0 : -1}
        aria-label={editable ? (src ? 'Change profile photo' : 'Upload profile photo') : alt}
        onKeyDown={(e) => {
          if (editable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            pickFile()
          }
        }}
        className="pf-avatar"
        style={{
          ...dimension,
          cursor: editable ? 'pointer' : 'default',
        }}
      >
        {src ? (
          <img src={src} alt={alt} className="pf-avatar__img" draggable={false} />
        ) : editable ? (
          <div className="pf-empty-avatar">
            <ImagePlus size={Math.max(20, size * 0.30)} strokeWidth={1.6} aria-hidden />
          </div>
        ) : (
          <div className="pf-avatar__placeholder" style={{ fontSize: size * 0.36 }}>
            {initials || <User size={size * 0.4} aria-hidden />}
          </div>
        )}

        {processing && (
          <div aria-hidden className="pf-avatar__processing">
            <Loader2 size={Math.max(16, size * 0.28)} className="pf-avatar__spinner" />
          </div>
        )}
      </motion.div>

      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/png, image/jpeg, image/gif, image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            handleFile(f)
            e.target.value = ''
          }}
        />
      )}

      {/* Ghost "Upload photo" / "Change photo" button below avatar */}
      {editable && (
        <div className="pf-avatar__actions">
          <button
            type="button"
            onClick={pickFile}
            className="pf-avatar__btn"
            disabled={processing}
          >
            <Camera size={13} strokeWidth={2.25} aria-hidden />
            {src ? 'Change photo' : 'Upload photo'}
          </button>
          {src && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClear?.()
              }}
              className="pf-avatar__btn pf-avatar__btn--icon"
              aria-label="Remove photo"
              title="Remove photo"
            >
              <Trash2 size={13} strokeWidth={2.25} />
            </button>
          )}
        </div>
      )}

      {error && <span className="pf-avatar__error">{error}</span>}
    </div>
  )
}
