require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const bcrypt = require('bcryptjs');
const { User } = require('./models');
const { sequelize, connectDB } = require('./config/db');
const logger = require('./utils/logger');
const {
  initializeSocket,
  setupRedisAdapter,
  cleanupSocket,
} = require('./config/socket');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const noteRoutes = require('./routes/noteRoutes');
const feedRoutes = require('./routes/feedRoutes');
const liveRoutes = require('./routes/liveRoutes');
const aiQuizRoutes = require('./routes/aiQuizRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Global request logger
app.use((req, res, next) => {
  console.log('➡️ API HIT:', req.method, req.originalUrl);
  next();
});

// ROUTE MOUNTING (order matters — more specific first)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/participant', enrollmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/ai-quiz', aiQuizRoutes);
app.use('/api/profile', profileRoutes);

// Health check for AI service (separate path to avoid conflict with router)
app.get('/api/ai/health', async (req, res) => {
  try {
    const aiService = require('./services/aiService');
    const result = await aiService.checkHealth();
    if (result.available) {
      res.json({ status: 'ok', aiService: result.details });
    } else {
      res.status(503).json({ 
        status: 'error', 
        message: 'AI service is not responding',
        hint: 'Start the Python service: cd ai-service && python main.py'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'AI service unavailable',
      hint: 'Start the Python service: cd ai-service && python main.py'
    });
  }
});

// Custom route for updating profile exactly as requested
const profileController = require('./controllers/profileController');
const upload = require('./middleware/upload');
const authenticateToken = require('./middleware/auth');
app.put('/api/update-profile', authenticateToken, upload.single('profilePic'), profileController.updateProfile);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error on', req.method, req.originalUrl);
  console.error(err.stack);

  // Multer file-type / size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large. Maximum size is 5 MB.' });
  }
  if (err.message && err.message.includes('Only JPG')) {
    return res.status(415).json({ success: false, message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// Global 404 fallback with detailed logging
app.use((req, res) => {
  console.error('❌ ENDPOINT NOT FOUND:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    // Initialize Socket.IO
    const io = initializeSocket(server);
    app.set('io', io);
    logger.info('Socket.IO initialized');

    // Setup Redis adapter for multi-instance scaling (disabled for local dev)
    logger.info('Running Socket.IO in single-instance mode (Redis disabled for local dev)');

    // Create default admin if not exists
    const adminExists = await User.findOne({ where: { email: 'admin@test.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        phone: '0000000000',
        role: 'ADMIN'
      });
      logger.info('Default admin created: admin@test.com / admin123');
    } else {
      logger.info('Admin already exists');
    }

    server.listen(PORT, () => {
      logger.info(`🚀 WAVE INIT LMS Server running on http://localhost:${PORT}`);
      logger.info(`📋 Mounted routes:
   /api/auth      → auth routes
   /api/admin     → admin routes (+ analytics endpoints)
   /api/trainer   → trainer routes
   /api/participant → enrollment routes
   /api/feedback  → feedback routes
   /api/trainings → training routes
   /api/feed      → activity feed routes
   /api/notifications → notification routes (+ Socket.IO)
   /api/notes     → notes routes
   /api/survey    → survey routes
      `);
      logger.info('🔌 WebSocket server active on Socket.IO');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        logger.info('HTTP server closed');
        await cleanupSocket(io);
        await sequelize.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        logger.info('HTTP server closed');
        await cleanupSocket(io);
        await sequelize.close();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server', { 
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server };