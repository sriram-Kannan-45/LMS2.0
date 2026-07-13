import { AnimatePresence, motion } from 'framer-motion'
import { Award, BookOpen, BookPlus, ClipboardList, Code, FileText, GraduationCap, Home, LayoutDashboard, LogOut, Menu, MessageSquare, Search, Bell, Settings, Shield, Sparkles, Trophy, User, UserPlus, Users, X, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileDropdown from './student/profile/ProfileDropdown'
import Badge from './ui/Badge'


const iconMap = {
  Dashboard: <LayoutDashboard size={18} />,
  Trainings: <BookOpen size={18} />,
  Courses: <GraduationCap size={18} />,
  Trainers: <Users size={18} />,
  Participants: <Users size={18} />,
  Feedback: <MessageSquare size={18} />,
  Surveys: <ClipboardList size={18} />,
  'Add Trainer': <UserPlus size={18} />,
  'My Trainings': <BookOpen size={18} />,
  'My Courses': <GraduationCap size={18} />,
  'My Profile': <User size={18} />,
  Available: <BookOpen size={18} />,
  Enrollments: <BookPlus size={18} />,
  'Give Feedback': <MessageSquare size={18} />,
  'My Feedbacks': <MessageSquare size={18} />,
  'AI Quizzes': <Sparkles size={18} />,
  Overview: <Home size={18} />,
  Leaderboard: <Trophy size={18} />,
  Achievements: <Award size={18} />,
  Lessons: <FileText size={18} />,
  Coding: <Code size={18} />,
  Profile: <User size={18} />,
  ClipboardList: <ClipboardList size={18} />,
  FileText: <FileText size={18} />,
  Notes: <FileText size={18} />,
  'UserPlus': <UserPlus size={18} />,
  'Enrollment Requests': <UserPlus size={18} />,
  'Trainer Reports': <ClipboardList size={18} />,
}

const navGroups = {
  ADMIN: [
    {
      title: 'Overview',
      items: [
        { key: 'overview', label: 'Dashboard', icon: 'Dashboard' },
      ],
    },
    {
      title: 'Management',
      items: [
        { key: 'pending', label: 'Pending Approval', icon: 'Overview' },
        { key: 'trainings', label: 'Trainings', icon: 'Trainings' },
        { key: 'trainers', label: 'Trainers', icon: 'Trainers' },
        { key: 'participants', label: 'Participants', icon: 'Participants' },
      ],
    },
    {
      title: 'Content',
      items: [
        { key: 'sessions', label: 'Sessions', icon: 'AI Quizzes' },
        { key: 'notes', label: 'Notes', icon: 'Lessons' },
        { key: 'feedback', label: 'Feedback', icon: 'Feedback' },
        { key: 'surveys', label: 'Surveys', icon: 'Surveys' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { key: 'recordings', label: 'Recordings', icon: 'ClipboardList' },
      ],
    },
  ],
  TRAINER: [
    {
      title: 'Overview',
      items: [
        { key: 'courses', label: 'Trainings', icon: 'Trainings' },
      ],
    },
    {
      title: 'Content',
      items: [
        { key: 'notes', label: 'Notes & Resources', icon: 'Notes' },
        { key: 'enrollments', label: 'Enrollment Requests', icon: 'UserPlus' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { key: 'reports', label: 'Trainer Reports', icon: 'ClipboardList' },
        { key: 'feedback', label: 'Feedback Received', icon: 'Feedback' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { key: 'profile', label: 'My Profile', icon: 'My Profile' },
      ],
    },
  ],
  PARTICIPANT: [
    {
      title: 'Overview',
      items: [
        { key: 'overview', label: 'Overview', icon: 'Overview' },
      ],
    },
    {
      title: 'Learning',
      items: [
        { key: 'myEnrollments', label: 'My Trainings', icon: 'Trainings' },
        { key: 'leaderboard', label: 'Leaderboard', icon: 'Leaderboard' },
        { key: 'achievements', label: 'Achievements', icon: 'Achievements' },
      ],
    },
    {
      title: 'Activity',
      items: [
        { key: 'reports', label: 'My Reports', icon: 'Feedback' },
        { key: 'certificates', label: 'Certificates', icon: 'Achievements' },
        { key: 'feedback', label: 'Give Feedback', icon: 'Give Feedback' },
        { key: 'myFeedbacks', label: 'My Feedbacks', icon: 'My Feedbacks' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { key: 'profile', label: 'Profile', icon: 'Profile' },
      ],
    },
  ],
}

const pageDescriptions = {
  overview: 'Monitor your platform activity and key metrics',
  pending: 'Review and approve pending registrations',
  trainings: 'Manage all training programs',
  trainers: 'Manage trainer accounts and assignments',
  participants: 'View and manage learner accounts',
  sessions: 'Manage assessment and quiz sessions',
  notes: 'Organize course notes and resources',
  feedback: 'View and respond to feedback',
  surveys: 'Create and manage surveys',
  recordings: 'Access session recordings',
  courses: 'Manage your training courses',
  enrollments: 'Review enrollment requests',
  reports: 'View detailed analytics and reports',
  profile: 'Manage your account settings',
  myEnrollments: 'Your enrolled training programs',
  leaderboard: 'See how you rank among learners',
  achievements: 'Your badges and accomplishments',
  certificates: 'Download your completion certificates',
  myFeedbacks: 'Feedback you\'ve submitted',
}

function Layout({ user, children, activeTab, onTabChange, onLogout, headerSlot }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const groups = navGroups[user.role] || []
  const isParticipant = user.role === 'PARTICIPANT'

  const initials = (name) =>
    name ? name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'

  const closeSidebar = () => setSidebarOpen(false)

  const currentPageLabel = (() => {
    for (const group of groups) {
      const found = group.items.find(i => i.key === activeTab)
      if (found) return found.label
    }
    return 'Dashboard'
  })()

  const currentPageDescription = pageDescriptions[activeTab] || ''

  return (
    <div className={`app-layout${user.role === 'PARTICIPANT' || user.role === 'ADMIN' ? ' theme-academic' : ''}`}>
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
          <button
            className="sidebar-close-btn"
            onClick={closeSidebar}
            style={{
              marginLeft: 'auto',
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(148,163,184,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {groups.map((group, gi) => (
            <div key={gi}>
              <div className="sidebar-nav-label">{group.title}</div>
              {group.items.map((item) => (
                <motion.button
                  key={item.key}
                  className={`sidebar-nav-item${activeTab === item.key ? ' active' : ''}`}
                  onClick={() => {
                    if (item.key === 'recordings') {
                      const path = user.role === 'ADMIN' ? '/admin/recordings' : '/trainer/recordings'
                      navigate(path)
                    } else {
                      onTabChange(item.key)
                    }
                    closeSidebar()
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="nav-icon">
                    {iconMap[item.icon]}
                  </span>
                  <span>{item.label}</span>
                </motion.button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer — user profile */}
        <div className="sidebar-footer">
          {isParticipant ? (
            <ProfileDropdown
              user={user}
              onTabChange={onTabChange}
              onLogout={onLogout}
            />
          ) : (
            <motion.div
              className="sidebar-user"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="sidebar-user-avatar">
                {initials(user.name)}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <Badge color={user.role === 'ADMIN' ? 'danger' : user.role === 'TRAINER' ? 'success' : 'primary'} className="mt-1 text-[10px] scale-90 origin-left">
                  {user.role}
                </Badge>
              </div>
              <button className="sidebar-logout-btn" onClick={onLogout} title="Sign Out">
                <LogOut size={14} />
              </button>
            </motion.div>
          )}
        </div>
      </aside>

      {/* Floating Mobile Sidebar Toggle Button */}
      {!sidebarOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mobile-sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </motion.button>
      )}

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header Bar */}
        <header className="top-header">
          <div className="top-header__left">
            <div className="top-header__breadcrumb">
              <span className="top-header__breadcrumb-page">{currentPageLabel}</span>
              {currentPageDescription && (
                <span className="top-header__breadcrumb-desc">{currentPageDescription}</span>
              )}
            </div>
          </div>
          <div className="top-header__right">
            <div className="top-header__search">
              <Search size={16} className="top-header__search-icon" />
              <input
                type="text"
                placeholder="Search..."
                className="top-header__search-input"
              />
            </div>
            <button className="top-header__icon-btn" title="Notifications">
              <Bell size={18} />
              <span className="top-header__notify-dot" />
            </button>
            <div className="top-header__divider" />
            <div className="top-header__user">
              <div className="top-header__avatar">
                {initials(user.name)}
              </div>
              <div className="top-header__user-info">
                <span className="top-header__user-name">{user.name}</span>
                <span className="top-header__user-role">{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <motion.main
          className="page-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}

export default Layout
