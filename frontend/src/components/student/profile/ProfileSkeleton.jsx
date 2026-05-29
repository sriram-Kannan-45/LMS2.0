import { motion } from 'framer-motion'

/**
 * ProfileSkeleton — full-page shimmer placeholder for the profile tab.
 * Mirrors the real layout (hero · mini stats · 2-col main grid) so the
 * transition feels seamless when data arrives.
 */
function Sk({ w, h, r = 10, style }) {
  return (
    <span
      className="pf-sk"
      style={{
        display: 'inline-block',
        width: w,
        height: h,
        borderRadius: r,
        ...style,
      }}
    />
  )
}

export default function ProfileSkeleton() {
  return (
    <motion.div
      className="pf-page"
      data-look="classic"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* HERO */}
      <section className="pf-hero">
        <div className="pf-hero__row">
          <Sk w={108} h={108} r="50%" />
          <div className="pf-hero__info" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sk w={220} h={26} />
            <Sk w={180} h={14} />
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <Sk w={80} h={12} />
              <Sk w={120} h={12} />
              <Sk w={90} h={12} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Sk w={92} h={92} r="50%" />
            <Sk w={120} h={40} />
          </div>
        </div>
      </section>

      {/* MINI STATS */}
      <div className="pf-mini-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pf-mini" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Sk w={38} h={38} r={12} />
            <Sk w="60%" h={11} />
            <Sk w="80%" h={26} />
            <Sk w="50%" h={11} />
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="pf-grid-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <section className="pf-glass" style={{ padding: 22 }}>
            <Sk w={140} h={16} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Sk key={i} w={Math.round(Math.random() * 60) + 60} h={26} r={999} />
              ))}
            </div>
          </section>

          <section className="pf-glass" style={{ padding: 22 }}>
            <Sk w={160} h={16} style={{ marginBottom: 12 }} />
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Sk w={64} h={64} r="50%" />
                  <Sk w={90} h={12} />
                  <Sk w={120} h={10} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <section className="pf-rank" style={{ padding: 22 }}>
            <Sk w={130} h={16} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Sk w={84} h={56} r={14} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Sk w="100%" h={12} />
                <Sk w="80%" h={12} />
              </div>
            </div>
          </section>

          <section className="pf-glass" style={{ padding: 22 }}>
            <Sk w={150} h={16} style={{ marginBottom: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, background: 'var(--pf-track-soft, rgba(15,23,42,0.04))' }}>
                  <Sk w={36} h={36} r={10} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <Sk w="60%" h={12} />
                    <Sk w="40%" h={10} />
                  </div>
                  <Sk w={48} h={10} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}
