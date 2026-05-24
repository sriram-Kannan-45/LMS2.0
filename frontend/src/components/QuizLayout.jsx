import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';

function QuizLayout({ user, activeTab, onTabChange, onLogout, title, subtitle, children }) {
  return (
    <Layout user={user} activeTab={activeTab} onTabChange={onTabChange} onLogout={onLogout}>
      <div className="page-content">
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6"
        >
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {title}
              </motion.h2>
              {subtitle && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}
                >
                  {subtitle}
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </Layout>
  );
}

export default QuizLayout;
