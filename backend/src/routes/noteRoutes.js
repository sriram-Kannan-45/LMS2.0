const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Note, User, Training, Notification } = require('../models');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');
const ActivityService = require('../services/activityService');

const router = express.Router();

// Ensure uploads directory exists
const notesDir = path.join(__dirname, '../../../uploads/notes');
if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir, { recursive: true });
}

// Configure multer for notes storage
const notesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, notesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const notesUpload = multer({
  storage: notesStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: pdf, jpg, png, gif, mp4, webm, mov'), false);
    }
  }
});

// Helper to detect file type
const detectFileType = (file, link) => {
  if (link) return 'LINK';
  if (!file) return null;
  
  const mime = file.mimetype || '';
  if (mime.includes('image')) return 'IMAGE';
  if (mime.includes('video')) return 'VIDEO';
  if (mime.includes('pdf')) return 'PDF';
  
  // Fallback to extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'IMAGE';
  if (['.mp4', '.webm', '.mov'].includes(ext)) return 'VIDEO';
  if (ext === '.pdf') return 'PDF';
  
  return 'LINK';
};

// TRAINER: Upload note
router.post(
  '/',
  authenticateToken,
  roleMiddleware('TRAINER'),
  notesUpload.single('file'),
  async (req, res) => {
    try {
      const { title, description, link, trainingId } = req.body;
      const trainerId = req.user.id;

      console.log('📤 Note upload - trainerId:', trainerId);
      console.log('📤 Note upload - body:', req.body);
      console.log('📤 Note upload - file:', req.file);

      if (!title) {
        return res.status(422).json({ error: 'Title is required' });
      }

      let fileUrl = null;
      let fileType = null;
      let fileName = null;
      let fileSize = null;

      // Handle file upload
      if (req.file) {
        fileUrl = `/uploads/notes/${req.file.filename}`;
        fileName = req.file.originalname;
        fileSize = req.file.size;
        fileType = detectFileType(req.file, null);
        console.log('📎 File uploaded:', fileUrl, 'Type:', fileType);
      } 
      // Handle link
      else if (link) {
        fileUrl = link;
        fileType = 'LINK';
        console.log('🔗 Link provided:', link);
      } else {
        return res.status(422).json({ error: 'File or link is required' });
      }

      const note = await Note.create({
        title,
        description: description || null,
        fileUrl,
        fileType,
        fileName,
        fileSize,
        trainerId: parseInt(trainerId),
        trainingId: trainingId ? parseInt(trainingId) : null,
        status: 'PENDING'
      });

      console.log('✅ Note created with ID:', note.id);

      const io = req.app.get('io');
      const trainer = await User.findByPk(trainerId);
      const training = trainingId ? await Training.findByPk(trainingId) : null;

      // Log activity
      await ActivityService.logActivity({
        userId: trainerId,
        userName: trainer?.name || 'Unknown',
        action: 'NOTE_UPLOADED',
        entityType: 'Note',
        entityId: note.id,
        details: { trainingName: training?.title || 'General' }
      }, io);

      // Notify admins
      const adminUsers = await User.findAll({ where: { role: 'ADMIN' } });
      for (const admin of adminUsers) {
        await Notification.create({
          userId: admin.id,
          message: `Trainer ${trainer?.name || 'Unknown'} uploaded a new note: ${title}`,
          type: 'NOTE_UPLOAD',
          isRead: false
        });
      }

      res.status(201).json({
        message: 'Note uploaded successfully. Pending admin approval.',
        note
      });
    } catch (error) {
      console.error('❌ Upload note error:', error.message, error.stack);
      res.status(500).json({ error: 'Server error uploading note' });
    }
  }
);

// TRAINER: Get own notes
router.get(
  '/my-notes',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const trainerId = req.user.id;
      const notes = await Note.findAll({
        where: { trainerId },
        order: [['created_at', 'DESC']]
      });
      res.json({ notes });
    } catch (error) {
      console.error('Get trainer notes error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ADMIN: Get notes (with optional status filter: pending, approved, or all)
router.get(
  '/admin/notes',
  authenticateToken,
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const { status } = req.query;
      
      const where = {};
      if (status === 'pending') {
        where.status = 'PENDING';
      } else if (status === 'approved') {
        where.status = 'APPROVED';
      }
      // If no status filter, return all notes
      
      const notes = await Note.findAll({
        where,
        include: [
          { model: User, as: 'trainer', attributes: ['id', 'name', 'email'] },
          { model: Training, as: 'training', attributes: ['id', 'title'], required: false }
        ],
        order: [['created_at', 'DESC']]
      });
      res.json({ notes });
    } catch (error) {
      console.error('Get admin notes error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ADMIN: Get pending notes (legacy route - redirects to admin/notes with status filter)
router.get(
  '/pending',
  authenticateToken,
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const notes = await Note.findAll({
        where: { status: 'PENDING' },
        include: [
          { model: User, as: 'trainer', attributes: ['id', 'name', 'email'] },
          { model: Training, as: 'training', attributes: ['id', 'title'], required: false }
        ],
        order: [['created_at', 'DESC']]
      });
      res.json({ notes });
    } catch (error) {
      console.error('Get pending notes error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ADMIN: Approve/reject note
router.put(
  '/:id/status',
  authenticateToken,
  roleMiddleware('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(422).json({ error: 'Invalid status. Use APPROVED or REJECTED' });
      }

      const note = await Note.findByPk(id);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      await note.update({ status });

      console.log(`✅ Note ${id} status changed to:`, status);

      const io = req.app.get('io');
      const trainer = await User.findByPk(note.trainerId);

      // Notify trainer
      await Notification.create({
        userId: note.trainerId,
        message: status === 'APPROVED' 
          ? `Your note "${note.title}" has been approved` 
          : `Your note "${note.title}" has been rejected`,
        type: 'NOTE_STATUS',
        isRead: false
      });

      // Log activity
      await ActivityService.logActivity({
        userId: req.user.id,
        userName: req.user.name || 'Admin',
        action: status === 'APPROVED' ? 'NOTE_APPROVED' : 'NOTE_REJECTED',
        entityType: 'Note',
        entityId: note.id,
        details: { noteTitle: note.title, trainerName: trainer?.name }
      }, io);

      res.json({ message: `Note ${status.toLowerCase()} successfully`, note });
    } catch (error) {
      console.error('Update note status error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PARTICIPANT: Get approved notes
router.get(
  '/',
  authenticateToken,
  roleMiddleware('PARTICIPANT'),
  async (req, res) => {
    try {
      const notes = await Note.findAll({
        where: { status: 'APPROVED' },
        include: [
          { model: User, as: 'trainer', attributes: ['id', 'name', 'email'] },
          { model: Training, as: 'training', attributes: ['id', 'title'], required: false }
        ],
        order: [['created_at', 'DESC']]
      });
      res.json({ notes });
    } catch (error) {
      console.error('Get approved notes error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE note (trainer can delete their own, admin can delete any)
router.delete(
  '/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const note = await Note.findByPk(id);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Allow if owner or admin
      if (note.trainerId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this note' });
      }

      // Delete file if exists
      if (note.fileUrl && !note.fileUrl.startsWith('http')) {
        const filePath = path.join(__dirname, '../../..', note.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await note.destroy();

      console.log('✅ Note deleted:', id);

      res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      console.error('Delete note error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;