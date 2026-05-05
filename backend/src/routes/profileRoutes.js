const express = require('express');
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth');
const roleMiddleware = require('../middleware/roles');
const upload = require('../middleware/upload');

const router = express.Router();

// Trainer profile routes - mounted at /api/profile in app.js
router.post(
  '/trainer/profile',
  authenticateToken,
  roleMiddleware('TRAINER'),
  upload.single('profileImage'),
  (req, res) => profileController.createOrUpdateProfile(req, res)
);

router.put(
  '/trainer/profile',
  authenticateToken,
  roleMiddleware('TRAINER'),
  upload.single('profileImage'),
  (req, res) => profileController.createOrUpdateProfile(req, res)
);

router.get(
  '/trainer/profile',
  authenticateToken,
  roleMiddleware('TRAINER'),
  (req, res) => profileController.getProfile(req, res)
);

module.exports = router;