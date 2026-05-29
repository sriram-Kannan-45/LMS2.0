import { motion } from 'framer-motion'

/**
 * LiveBadge — small "Live" pulse chip for the leaderboard header.
 * Uses CSS for the ping ring, keeps motion respectfully subtle.
 */
export default function LiveBadge({ connected = true, label = 'Live' }) {
  return (
    <span
      className={`ac-chip ${connected ? 'ac-chip-success' : ''}`}
      style={connected ? {} : { opacity: 0.7 }}
      aria-live="polite"
    >
      <span style={{ position: 'relative', width: 8, height: 8 }}>
        {connected && (
          <motion.span
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '9999px',
              background: 'var(--academic-success)',
            }}
          />
        )}
        <span
          style={{
            position: 'relative', display: 'block', width: 8, height: 8,
            borderRadius: '9999px',
            background: connected ? 'var(--academic-success)' : 'var(--academic-text-muted)',
          }}
        />
      </span>
      {connected ? label : 'Offline'}
    </span>
  )
}
