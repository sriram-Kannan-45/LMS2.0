import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, BookOpen, Users, MessageSquare, ClipboardList, 
  Sparkles, LogOut, Menu, X, ChevronRight, Settings, Home, FileText
} from 'lucide-react'

const iconMap = {
  Dashboard: <LayoutDashboard size={18} />,
  Available: <BookOpen size={18} />,
  Enrollments: <FileText size={18} />,
  Feedback: <MessageSquare size={18} />,
  'My Feedbacks': <MessageSquare size={18} />,
  'AI Quizzes': <Sparkles size={18} />,
  'My Profile': <Users size={18} />,
}

const navItems = {
  PARTICIPANT: [
    { key: 'available', label: 'Available Trainings', icon: 'Available' },
    { key: 'myEnrollments', label: 'My Enrollments', icon: 'Enrollments' },
    { key: 'ai-quizzes', label: 'AI Quizzes', icon: 'AI Quizzes' },
    { key: 'feedback', label: 'Give Feedback', icon: 'Feedback' },
    { key: 'myFeedbacks', label: 'My Feedbacks', icon: 'My Feedbacks' },
  ],
}

export default function ModernLayout({ user, children, activeTab, onTabChange, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const items = navItems[user?.role] || navItems.PARTICIPANT

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50/50 backdrop-blur-xl border-r border-white/20">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border-b border-gray-100"
          >
            <motion.div
              whileHover={{ scale: 1.08, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">WAVE INIT</p>
                <p className="text-xs text-gray-500">Learning Hub</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 mb-4">
              Navigation
            </p>
            {items.map((item, index) => {
              const isActive = activeTab === item.key
              return (
                <motion.button
                  key={item.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    onTabChange(item.key)
                    closeSidebar()
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                    {iconMap[item.icon]}
                  </span>
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="w-1.5 h-1.5 rounded-full bg-purple-600"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                </motion.button>
              )
            })}
          </nav>

          {/* AI Banner */}
          <div className="mx-4 mb-6 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-purple-600" />
              <p className="text-xs font-bold text-purple-700">AI POWERED</p>
            </div>
            <p className="text-xs text-purple-700/80">Smart quizzes with AI-driven insights</p>
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                {(user?.name || 'U')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">Premium Participant</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 font-medium text-sm transition-all"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </motion.button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
