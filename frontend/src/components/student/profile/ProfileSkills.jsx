import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Tag } from 'lucide-react'

/**
 * ProfileSkills — Linear/Vercel SaaS spec (2026-05-28 v3).
 * Header + ghost "+ Add" button · dashed muted empty state · brand-light pills.
 */
export default function ProfileSkills({ skills = [], onAdd, max = 12 }) {
  const list = Array.isArray(skills) ? skills.slice(0, max) : []
  const empty = list.length === 0

  return (
    <section className="pf-skills">
      <div className="pf-skills__head">
        <div className="pf-skills__title-block">
          <h3 className="pf-skills__title">Skills earned</h3>
          <p className="pf-skills__sub">Tag what you've been mastering</p>
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="pf-skills__add"
            aria-label="Add skill"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add
          </button>
        )}
      </div>

      {empty ? (
        <div className="pf-skills__empty">
          <Tag size={28} strokeWidth={1.6} className="pf-skills__empty-icon" aria-hidden />
          <p className="pf-skills__empty-title">No skills yet</p>
          <p className="pf-skills__empty-sub">
            Click <strong>Add</strong> to share what you're learning.
          </p>
        </div>
      ) : (
        <div className="pf-skills__list">
          <AnimatePresence initial={false}>
            {list.map((s, i) => (
              <motion.span
                key={s + i}
                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.22, delay: i * 0.025 }}
                className="pf-skill"
              >
                {s}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
