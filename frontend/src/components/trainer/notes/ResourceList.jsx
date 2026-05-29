import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Search, Filter, FileText } from 'lucide-react'
import ResourceCard from './ResourceCard'
import { FILTER_FACETS } from '../../../utils/fileTypes'

/**
 * ResourceList — searchable, filterable grid of the trainer's resources.
 * Uses the shared FILTER_FACETS so the same chips work in both
 * trainer + participant lists.
 */
export default function ResourceList({
  notes = [],
  loading = false,
  onPreview,
  onEdit,
  onDelete,
}) {
  const [search, setSearch] = useState('')
  const [facet, setFacet] = useState('ALL')

  // Counts per facet for pretty badges
  const counts = useMemo(() => {
    const c = {}
    FILTER_FACETS.forEach((f) => {
      c[f.key] = notes.filter(f.match).length
    })
    return c
  }, [notes])

  const filtered = useMemo(() => {
    const f = FILTER_FACETS.find((x) => x.key === facet) || FILTER_FACETS[0]
    const q = search.trim().toLowerCase()
    return notes.filter((n) => {
      if (!f.match(n)) return false
      if (!q) return true
      return (
        n.title?.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q) ||
        n.fileName?.toLowerCase().includes(q) ||
        n.training?.title?.toLowerCase().includes(q)
      )
    })
  }, [notes, search, facet])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div className="tr-notes__toolbar" role="search">
        <div className="tr-notes__search">
          <Search size={15} className="tr-notes__search-icon" aria-hidden />
          <input
            type="search"
            placeholder="Search resources by title, description, file name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search resources"
          />
        </div>
        <div className="tr-notes__filters" role="tablist" aria-label="Filter by file type">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', fontSize: 11, fontWeight: 700,
            color: 'var(--tn-text-muted, #64748b)',
            textTransform: 'uppercase', letterSpacing: 0.4,
          }}>
            <Filter size={11} /> Type
          </span>
          {FILTER_FACETS.map((f) =>
            counts[f.key] || f.key === 'ALL' ? (
              <button
                key={f.key}
                role="tab"
                aria-selected={facet === f.key}
                onClick={() => setFacet(f.key)}
                className={'tr-notes__chip' + (facet === f.key ? ' tr-notes__chip--active' : '')}
              >
                {f.label}
                <span className="tr-notes__chip-count">{counts[f.key] || 0}</span>
              </button>
            ) : null
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && notes.length === 0 && (
        <div className="tr-notes__grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="tr-notes__resource" style={{ minHeight: 240 }}>
              <div className="tr-notes__skeleton" style={{ height: 130 }} />
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="tr-notes__skeleton" style={{ height: 14, width: '70%' }} />
                <div className="tr-notes__skeleton" style={{ height: 12, width: '90%' }} />
                <div className="tr-notes__skeleton" style={{ height: 12, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty (no notes at all) */}
      {!loading && notes.length === 0 && (
        <div className="tr-notes__empty">
          <span className="tr-notes__empty-icon"><FileText size={24} /></span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--tn-text, #0f172a)' }}>
            No resources yet
          </h3>
          <p style={{ margin: 0, fontSize: 13 }}>
            Upload your first PDF, slides, video, or any other learning resource above.
            Participants will see it once an admin approves it.
          </p>
        </div>
      )}

      {/* Empty (filters too narrow) */}
      {!loading && notes.length > 0 && filtered.length === 0 && (
        <div className="tr-notes__empty" style={{ padding: '28px 20px' }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            No resources match your search or filter.
          </p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="tr-notes__grid">
          <AnimatePresence initial={false}>
            {filtered.map((note, i) => (
              <ResourceCard
                key={note.id}
                note={note}
                index={i}
                onPreview={onPreview}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
