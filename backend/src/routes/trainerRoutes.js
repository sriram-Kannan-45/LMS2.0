const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Training, User, Enrollment, Feedback, TrainerProfile } = require('../models');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/trainer/trainings - trainer sees their assigned trainings
router.get(
  '/trainings',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const trainerId = req.user.id;

      const trainings = await Training.findAll({
        where: { trainerId },
        order: [['startDate', 'ASC']]
      });

      const formattedTrainings = await Promise.all(trainings.map(async t => {
        const enrolledCount = await Enrollment.count({ where: { trainingId: t.id, status: 'ENROLLED' } });
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          startDate: t.startDate,
          endDate: t.endDate,
          capacity: t.capacity,
          enrolledCount,
          availableSeats: t.capacity ? (t.capacity - enrolledCount) : null
        };
      }));

      res.json({ trainings: formattedTrainings });
    } catch (error) {
      console.error('Trainer get trainings error:', error.message);
      res.status(500).json({ error: 'Server error fetching trainings' });
    }
  }
);

// GET /api/trainer/feedbacks - trainer sees feedback for their trainings
router.get(
  '/feedbacks',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const trainerId = req.user.id;

      const trainings = await Training.findAll({
        where: { trainerId },
        attributes: ['id']
      });
      const trainingIds = trainings.map(t => t.id);

      if (trainingIds.length === 0) {
        return res.json({ feedbacks: [], averageRating: 0 });
      }

      const feedbacks = await Feedback.findAll({
        where: { trainingId: trainingIds },
        include: [
          { model: Training, as: 'training', attributes: ['id', 'title'] },
          { model: User, as: 'participant', attributes: ['id', 'name', 'email'] }
        ],
        order: [['submitted_at', 'DESC']]
      });

      const formattedFeedbacks = feedbacks.map(f => ({
        id: f.id,
        trainingId: f.trainingId,
        trainingTitle: f.training?.title,
        trainerRating: f.trainerRating,
        subjectRating: f.subjectRating,
        comments: f.comments,
        anonymous: f.anonymous,
        participantName: f.anonymous ? 'Anonymous' : f.participant?.name,
        submittedAt: f.submitted_at || f.createdAt
      }));

      const avgTrainerRating = feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.trainerRating, 0) / feedbacks.length).toFixed(1)
        : 0;
      const avgSubjectRating = feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.subjectRating, 0) / feedbacks.length).toFixed(1)
        : 0;

      res.json({
        feedbacks: formattedFeedbacks,
        averageTrainerRating: avgTrainerRating,
        averageSubjectRating: avgSubjectRating,
        averageRating: avgTrainerRating
      });
    } catch (error) {
      console.error('Trainer get feedbacks error:', error.message);
      res.status(500).json({ error: 'Server error fetching feedbacks' });
    }
  }
);

// GET /api/trainer/profile - fetch own full profile (user + extended profile)
router.get(
  '/profile',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const trainer = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'username', 'phone'],
        include: [{
          model: TrainerProfile,
          as: 'profile',
          attributes: ['id', 'phone', 'dob', 'qualification', 'experience', 'imagePath'],
          required: false
        }]
      });

      if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

      res.json({
        trainer: {
          id: trainer.id,
          name: trainer.name,
          email: trainer.email,
          username: trainer.username,
          phone: trainer.phone,
          profile: trainer.profile ? {
            phone: trainer.profile.phone,
            dob: trainer.profile.dob,
            qualification: trainer.profile.qualification,
            experience: trainer.profile.experience,
            imagePath: trainer.profile.imagePath
          } : null
        }
      });
    } catch (error) {
      console.error('Trainer get profile error:', error.message);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/trainer/profile - create or update extended profile with image upload
router.post(
  '/profile',
  authenticateToken,
  roleMiddleware('TRAINER'),
  upload.single('profileImage'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { phone, dob, qualification, experience } = req.body;

      let imagePath = undefined;
      if (req.file) {
        // Store relative path for serving via static files
        imagePath = `/uploads/trainer/${req.file.filename}`;
      }

      const existing = await TrainerProfile.findOne({ where: { userId } });

      if (existing) {
        const updateData = {};
        if (phone !== undefined) updateData.phone = phone;
        if (dob !== undefined) updateData.dob = dob || null;
        if (qualification !== undefined) updateData.qualification = qualification;
        if (experience !== undefined) updateData.experience = experience;
        if (imagePath !== undefined) updateData.imagePath = imagePath;

        await existing.update(updateData);
        res.json({ message: 'Profile updated successfully', profile: existing });
      } else {
        const profile = await TrainerProfile.create({
          userId,
          phone: phone || null,
          dob: dob || null,
          qualification: qualification || null,
          experience: experience || null,
          imagePath: imagePath || null
        });
        res.status(201).json({ message: 'Profile created successfully', profile });
      }
    } catch (error) {
      console.error('Trainer save profile error:', error.message);
      res.status(500).json({ error: 'Server error saving profile' });
    }
  }
);

// PUT /api/trainer/profile - update profile (JSON, no image)
router.put(
  '/profile',
  authenticateToken,
  roleMiddleware('TRAINER'),
  upload.single('profileImage'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      console.log('🔍 UPDATE PROFILE - userId:', userId);
      console.log('🔍 UPDATE PROFILE - body:', JSON.stringify(req.body));
      console.log('🔍 UPDATE PROFILE - file:', req.file ? req.file.originalname : 'no file');

      // SAFE FIELD EXTRACTION - Handle undefined/null gracefully
      const name = req.body.name ? String(req.body.name).trim() : '';
      const phone = req.body.phone ? String(req.body.phone).trim() : '';
      const dob = req.body.dob ? String(req.body.dob).trim() : '';
      const qualification = req.body.qualification ? String(req.body.qualification).trim() : '';
      const experience = req.body.experience ? String(req.body.experience).trim() : '';

      console.log('🔍 Extracted fields - name:', name, 'phone:', phone, 'dob:', dob);

      // Update user base info (User table)
      const trainer = await User.findByPk(userId);
      if (!trainer) {
        console.log('❌ Trainer not found for userId:', userId);
        return res.status(404).json({ error: 'Trainer not found' });
      }

      // Build update object for User table
      const userUpdateData = {};
      if (name) userUpdateData.name = name;
      if (phone) userUpdateData.phone = phone;

      if (Object.keys(userUpdateData).length > 0) {
        await trainer.update(userUpdateData);
        console.log('✅ User table updated');
      }

      // Handle image path
      let imagePath = null;
      if (req.file) {
        imagePath = `/uploads/trainer/${req.file.filename}`;
        console.log('✅ Image uploaded:', imagePath);
      }

      // Build update data for TrainerProfile table
      const profileUpdateData = {};
      if (phone) profileUpdateData.phone = phone;
      if (dob) profileUpdateData.dob = dob;
      if (qualification) profileUpdateData.qualification = qualification;
      if (experience) profileUpdateData.experience = experience;
      if (imagePath) profileUpdateData.imagePath = imagePath;

      console.log('🔍 Profile update data:', profileUpdateData);

      // Check if profile exists
      let profile = await TrainerProfile.findOne({ where: { userId } });
      
      let savedProfile;
      if (profile) {
        // Update existing profile
        await profile.update(profileUpdateData);
        savedProfile = profile;
        console.log('✅ Existing profile updated');
      } else {
        // Create new profile
        savedProfile = await TrainerProfile.create({
          userId,
          ...profileUpdateData
        });
        console.log('✅ New profile created');
      }

      // Return success response
      res.json({
        message: 'Profile updated successfully',
        trainer: { 
          id: trainer.id, 
          name: trainer.name, 
          email: trainer.email, 
          phone: trainer.phone 
        },
        profile: {
          id: savedProfile.id,
          phone: savedProfile.phone,
          dob: savedProfile.dob,
          qualification: savedProfile.qualification,
          experience: savedProfile.experience,
          imagePath: savedProfile.imagePath
        }
      });

    } catch (error) {
      console.error('❌ Trainer update profile ERROR:', error.message, error.stack);
      res.status(500).json({ 
        error: 'Failed to update profile',
        details: error.message 
      });
    }
  }
);

// Also allow POST for profile update (simpler than PUT for JSON)
router.post(
  '/profile',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      console.log('🔍 POST PROFILE UPDATE - userId:', userId);
      console.log('🔍 POST PROFILE UPDATE - body:', JSON.stringify(req.body));

      const { name, phone, dob, qualification, experience } = req.body;

      // Update User table
      const trainer = await User.findByPk(userId);
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }

      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (phone) userUpdate.phone = phone;
      
      if (Object.keys(userUpdate).length > 0) {
        await trainer.update(userUpdate);
      }

      // Update/Create TrainerProfile
      const profileData = {};
      if (phone) profileData.phone = phone;
      if (dob) profileData.dob = dob;
      if (qualification) profileData.qualification = qualification;
      if (experience) profileData.experience = experience;

      let profile = await TrainerProfile.findOne({ where: { userId } });
      
      if (profile) {
        await profile.update(profileData);
      } else {
        profile = await TrainerProfile.create({ userId, ...profileData });
      }

      console.log('✅ POST Profile updated successfully');

      res.json({
        message: 'Profile updated',
        trainer,
        profile
      });

    } catch (error) {
      console.error('❌ POST Profile update error:', error.message);
      res.status(500).json({ error: 'Server error: ' + error.message });
    }
  }
);
router.get('/notifications', authenticateToken, roleMiddleware('TRAINER'), async (req, res) => {
  try {
    const { Notification } = require('../models');
    const notifications = await Notification.findAll({ where: { userId: req.user.id }, order: [['created_at', 'DESC']] });
    res.json({ notifications });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/trainer/notifications/read
router.put('/notifications/read', authenticateToken, roleMiddleware('TRAINER'), async (req, res) => {
  try {
    const { Notification } = require('../models');
    await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
    res.json({ message: 'Marked as read' });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/trainer/change-password - trainer changes their own password
router.put(
  '/change-password',
  authenticateToken,
  roleMiddleware('TRAINER'),
  async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      if (!oldPassword || !newPassword) {
        return res.status(422).json({ error: 'Old and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(422).json({ error: 'Password must be at least 6 characters' });
      }

      const trainer = await User.findByPk(userId);
      if (!trainer) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await bcrypt.compare(oldPassword, trainer.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await trainer.update({ password: hashedPassword });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Trainer change password error:', error.message);
      res.status(500).json({ error: 'Server error changing password' });
    }
  }
);

// ─── PUT /api/trainer/update ─────────────────────────────────────────────────
// Primary profile-update endpoint used by TrainerForm (multipart/form-data)
router.put(
  '/update',
  authenticateToken,
  roleMiddleware('TRAINER'),
  upload.single('profileImage'),
  async (req, res) => {
    try {
      // ── Debug logging ──────────────────────────────────────────────────────
      console.log('📥 [PUT /trainer/update] req.body :', req.body);
      console.log('📥 [PUT /trainer/update] req.file :', req.file ? req.file.filename : 'none');

      const trainerId = req.user?.id;
      if (!trainerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // ── Safe field extraction ──────────────────────────────────────────────
      const phone         = req.body.phone         ? String(req.body.phone).trim()         : '';
      const rawDob        = req.body.dob           ? String(req.body.dob).trim()           : '';
      const qualification = req.body.qualification ? String(req.body.qualification).trim() : '';
      const experience    = req.body.experience    ? String(req.body.experience).trim()    : '';
      const name          = req.body.name          ? String(req.body.name).trim()          : '';

      // ── Validation ─────────────────────────────────────────────────────────
      const validationErrors = [];

      if (phone && !/^[\d\s\+\-\(\)]{7,15}$/.test(phone)) {
        validationErrors.push('Phone must contain only digits, spaces, +, -, (, )');
      }

      let dob = null;
      if (rawDob) {
        // Normalize to YYYY-MM-DD regardless of what the browser sends
        const parsed = new Date(rawDob);
        if (isNaN(parsed.getTime())) {
          validationErrors.push('Date of birth is not a valid date');
        } else {
          // Format: YYYY-MM-DD
          dob = parsed.toISOString().split('T')[0];
        }
      }

      if (validationErrors.length > 0) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      // Require at least one field
      if (!phone && !dob && !qualification && !experience && !name && !req.file) {
        return res.status(400).json({ success: false, message: 'No data provided to update' });
      }

      // ── Update User table (name, phone) ────────────────────────────────────
      const trainer = await User.findByPk(trainerId);
      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }

      const userUpdate = {};
      if (name)  userUpdate.name  = name;
      if (phone) userUpdate.phone = phone;
      if (Object.keys(userUpdate).length > 0) {
        await trainer.update(userUpdate);
        console.log('✅ User table updated:', userUpdate);
      }

      // ── Build TrainerProfile update payload ────────────────────────────────
      const profileData = {};
      if (phone)         profileData.phone         = phone;
      if (dob)           profileData.dob           = dob;
      if (qualification) profileData.qualification = qualification;
      if (experience)    profileData.experience    = experience;

      // File stored on disk → save URL-accessible path
      if (req.file) {
        profileData.imagePath = `/uploads/trainer/${req.file.filename}`;
        console.log('✅ Image saved:', profileData.imagePath);
      }

      // ── Upsert TrainerProfile ──────────────────────────────────────────────
      let profile = await TrainerProfile.findOne({ where: { userId: trainerId } });
      if (profile) {
        await profile.update(profileData);
        console.log('✅ Existing profile updated');
      } else {
        profile = await TrainerProfile.create({ userId: trainerId, ...profileData });
        console.log('✅ New profile created');
      }

      // ── Reload to return the freshest data ─────────────────────────────────
      await trainer.reload();

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id:       trainer.id,
            name:     trainer.name,
            email:    trainer.email,
            username: trainer.username,
            phone:    trainer.phone
          },
          profile: {
            phone:         profile.phone,
            dob:           profile.dob,
            qualification: profile.qualification,
            experience:    profile.experience,
            imagePath:     profile.imagePath
          }
        }
      });

    } catch (error) {
      console.error('❌ [PUT /trainer/update] ERROR:', error.message);
      console.error(error.stack);
      return res.status(500).json({
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  }
);

module.exports = router;
