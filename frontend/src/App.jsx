import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import TrainerDashboard from './pages/TrainerDashboard'
import ParticipantDashboard from './pages/ParticipantDashboard'
import ParticipantQuizzes from './pages/ParticipantQuizzes'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes user={user} onLogin={handleLogin} onLogout={handleLogout} />
      </BrowserRouter>
    </ToastProvider>
  )
}

function AppRoutes({ user, onLogin, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview')
  const location = useLocation()

  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 }
  }

  const DashboardWrapper = ({ component: Component, user, onLogout, defaultTab }) => (
    <Layout user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={onLogout}>
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Component user={user} onLogout={onLogout} activeTab={activeTab} onTabChange={setActiveTab} />
      </motion.div>
    </Layout>
  )

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="/register" element={<Register onLogin={onLogin} />} />

        <Route
          path="/admin"
          element={
            user?.role === 'ADMIN' ? (
              <DashboardWrapper component={AdminDashboard} user={user} onLogout={onLogout} defaultTab="overview" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/trainer"
          element={
            user?.role === 'TRAINER' ? (
              <DashboardWrapper component={TrainerDashboard} user={user} onLogout={onLogout} defaultTab="trainings" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/participant"
          element={
            user?.role === 'PARTICIPANT' ? (
              <DashboardWrapper component={ParticipantDashboard} user={user} onLogout={onLogout} defaultTab="available" />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/participant/quizzes"
          element={
            user?.role === 'PARTICIPANT' ? (
              <Layout user={user} onLogout={onLogout}>
                <ParticipantQuizzes user={user} />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AnimatePresence>
  )
}

export default App