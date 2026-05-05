import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, GraduationCap, Users, MessageSquare, ClipboardList, UserPlus, BookPlus, BookOpen, User, LogOut, Menu, Bell, X, ChevronRight, Sparkles } from 'lucide-react'

const iconMap = {
  Dashboard: <LayoutDashboard size={18} />,
  Trainings: <BookOpen size={18} />,
  Trainers: <Users size={18} />,
  Participants: <Users size={18} />,
  Feedback: <MessageSquare size={18} />,
  Surveys: <ClipboardList size={18} />,
  'Add Trainer': <UserPlus size={18} />,
  'Add Training': <BookPlus size={18} />,
  'My Trainings': <BookOpen size={18} />,
  'My Profile': <User size={18} />,
  Available: <BookOpen size={18} />,
  Enrollments: <BookPlus size={18} />,
  'Give Feedback': <MessageSquare size={18} />,
  'My Feedbacks': <MessageSquare size={18} />,
}

const navItems = {
  ADMIN: [
    { key: 'overview', label: 'Dashboard', icon: 'Dashboard' },
    { key: 'trainings', label: 'Trainings', icon: 'Trainings' },
    { key: 'trainers', label: 'Trainers', icon: 'Trainers' },
    { key: 'participants', label: 'Participants', icon: 'Participants' },
    { key: 'feedback', label: 'Feedback', icon: 'Feedback' },
    { key: 'surveys', label: 'Surveys', icon: 'Surveys' },
    { key: 'createTrainer', label: 'Add Trainer', icon: 'Add Trainer' },
    { key: 'createTraining', label: 'Add Training', icon: 'Add Training' },
  ],
  TRAINER: [
    { key: 'trainings', label: 'My Trainings', icon: 'My Trainings' },
    { key: 'feedback', label: 'Feedback', icon: 'Feedback' },
    { key: 'profile', label: 'My Profile', icon: 'My Profile' },
  ],
  PARTICIPANT: [
    { key: 'available', label: 'Available', icon: 'Available' },
    { key: 'myEnrollments', label: 'Enrollments', icon: 'Enrollments' },
    { key: 'feedback', label: 'Give Feedback', icon: 'Give Feedback' },
    { key: 'myFeedbacks', label: 'My Feedbacks', icon: 'My Feedbacks' },
  ],
}

const roleColors = {
  ADMIN: { gradient: 'from-rose-500 to-orange-500', badge: 'bg-rose-100 text-rose-700' },
  TRAINER: { gradient: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-100 text-emerald-700' },
  PARTICIPANT: { gradient: 'from-blue-500 to-indigo-500', badge: 'bg-blue-100 text-blue-700' },
}

function Layout({ user, children, activeTab, onTabChange, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const items = navItems[user.role] || []
  const colors = roleColors[user.role] || roleColors.PARTICIPANT

  const initials = (name) =>
    name ? name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="app-layout">
      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-overlay open"
            onClick={closeSidebar}
            style={{ display: 'block' }}
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo Header */}
        <div className="sidebar-header">
          <motion.div 
            whileHover={{ scale: 1.08, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="sidebar-logo"
          >
            W
          </motion.div>
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">WAVE INIT</span>
            <span className="sidebar-brand-tagline">Learning Management</span>
          </div>
          {/* Mobile close button */}
          <button
            className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            onClick={closeSidebar}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>
          {items.map((item, index) => (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`sidebar-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => { onTabChange(item.key); closeSidebar() }}
            >
              <span className="nav-icon">{iconMap[item.icon]}</span>
              <span>{item.label}</span>
              {activeTab === item.key && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="ml-auto"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <ChevronRight size={14} className="text-indigo-500 opacity-60" />
                </motion.div>
              )}
            </motion.button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Pro badge */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="mx-2 mb-3 p-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
              border: '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-indigo-500" />
              <span className="text-xs font-bold text-indigo-600">AI-Powered</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Smart quizzes & analytics enabled
            </p>
          </motion.div>

          <div className="sidebar-user">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="sidebar-user-avatar"
            >
              {initials(user.name)}
            </motion.div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="inline-flex items-center mt-0.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                  {user.role}
                </span>
              </div>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: -15 }}
              whileTap={{ scale: 0.9 }}
              className="sidebar-logout-btn" 
              onClick={onLogout} 
              title="Sign Out"
            >
              <LogOut size={15} />
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="top-header-left">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </motion.button>
            <h2 className="top-header-title">
              {items.find(i => i.key === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="top-header-right">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="header-btn relative" 
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, rotate: -10 }}
              whileTap={{ scale: 0.95 }}
              className="header-btn" 
              onClick={onLogout} 
              title="Sign Out"
            >
              <LogOut size={18} />
            </motion.button>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout