import { motion } from 'framer-motion'
import { Sparkles, Zap, CheckCircle2, BookOpen, Users, Award } from 'lucide-react'

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
}

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } }
}

const features = [
  { icon: Sparkles, label: 'AI-Powered Insights', desc: 'Smart analytics for every learner', color: '#818cf8' },
  { icon: Zap, label: 'Real-time Analytics', desc: 'Track progress as it happens', color: '#a78bfa' },
  { icon: CheckCircle2, label: 'Certified Programs', desc: 'Industry-recognized credentials', color: '#67e8f9' },
]

const stats = [
  { icon: BookOpen, value: '500+', label: 'Courses' },
  { icon: Users, value: '10K+', label: 'Learners' },
  { icon: Award, value: '98%', label: 'Success Rate' },
]

export default function LoginBranding() {
  return (
    <motion.div
      className="hidden lg:flex flex-col justify-center relative z-10 h-full px-12 xl:px-16"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {/* Logo + Brand */}
      <motion.div variants={item} className="mb-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-2xl font-bold text-white font-[Outfit]">W</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-[Outfit] tracking-tight">WAVE INIT</h1>
            <p className="text-sm text-white/50 font-medium tracking-wide">Learning Management System</p>
          </div>
        </div>

        <h2 className="text-[2.75rem] leading-[1.15] font-bold font-[Outfit] tracking-tight mb-5">
          <span className="text-white">Elevate Your</span>
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
            Learning Journey
          </span>
        </h2>
        <p className="text-base text-white/60 leading-relaxed max-w-sm">
          Experience next-generation education with our premium platform.
          Track progress, engage with content, and achieve your goals.
        </p>
      </motion.div>

      {/* Feature List */}
      <motion.div variants={item} className="space-y-4 mb-10">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-4 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
              style={{ background: `${f.color}18` }}
            >
              <f.icon className="w-5 h-5" style={{ color: f.color }} />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/90 block">{f.label}</span>
              <span className="text-xs text-white/40">{f.desc}</span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="flex gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <s.icon className="w-4 h-4 text-cyan-400/70" />
              <span className="text-xl font-bold text-white font-[Outfit]">{s.value}</span>
            </div>
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute bottom-8 left-12 right-12">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <p className="text-[11px] text-white/25 mt-4 font-medium">
          Trusted by leading institutions worldwide
        </p>
      </div>
    </motion.div>
  )
}
