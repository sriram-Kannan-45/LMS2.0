const { Training, Enrollment, Feedback, User, Notification } = require('../models');
const ActivityService = require('../services/activityService');

const updateTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, trainerId, startDate, endDate, capacity } = req.body;

    const training = await Training.findByPk(id);
    if (!training) return res.status(404).json({ error: 'Training not found' });

    if (trainerId) {
      const trainer = await User.findOne({ where: { id: trainerId, role: 'TRAINER' } });
      if (!trainer) return res.status(400).json({ error: 'Invalid trainer ID' });
    }

    await training.update({
      title: title || training.title,
      description: description !== undefined ? description : training.description,
      trainerId: trainerId ? parseInt(trainerId) : training.trainerId,
      startDate: startDate ? new Date(startDate) : training.startDate,
      endDate: endDate ? new Date(endDate) : training.endDate,
      capacity: capacity !== undefined ? (capacity ? parseInt(capacity) : null) : training.capacity
    });

    const updatedTraining = await Training.findByPk(id, {
      include: [{ model: User, as: 'trainer', attributes: ['id', 'name'], required: false }]
    });

    res.json({
      message: 'Training updated successfully',
      training: {
        id: updatedTraining.id,
        title: updatedTraining.title,
        description: updatedTraining.description,
        trainerId: updatedTraining.trainerId,
        trainerName: updatedTraining.trainer?.name,
        startDate: updatedTraining.startDate,
        endDate: updatedTraining.endDate,
        capacity: updatedTraining.capacity
      }
    });
  } catch (error) {
    console.error('Update training error:', error.message);
    res.status(500).json({ error: 'Server error updating training' });
  }
};

const deleteTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const training = await Training.findByPk(id);
    if (!training) return res.status(404).json({ error: 'Training not found' });

    await Feedback.destroy({ where: { trainingId: id } });
    await Enrollment.destroy({ where: { trainingId: id } });
    await Training.destroy({ where: { id } });

    res.json({ message: 'Training deleted successfully' });
  } catch (error) {
    console.error('Delete training error:', error.message);
    res.status(500).json({ error: 'Server error deleting training' });
  }
};

const updateTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const trainer = await User.findOne({ where: { id, role: 'TRAINER' } });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    if (email && email !== trainer.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) return res.status(400).json({ error: 'Email already in use' });
    }

    await trainer.update({ name: name || trainer.name, email: email || trainer.email });

    res.json({
      message: 'Trainer updated successfully',
      trainer: { id: trainer.id, name: trainer.name, email: trainer.email, username: trainer.username }
    });
  } catch (error) {
    console.error('Update trainer error:', error.message);
    res.status(500).json({ error: 'Server error updating trainer' });
  }
};

const deleteTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const trainer = await User.findOne({ where: { id, role: 'TRAINER' } });
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    await Training.update({ trainerId: null }, { where: { trainerId: id } });
    await User.destroy({ where: { id } });

    res.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Delete trainer error:', error.message);
    res.status(500).json({ error: 'Server error deleting trainer' });
  }
};

const getStats = async (req, res) => {
  try {
    const totalTrainings = await Training.count();
    const totalTrainers = await User.count({ where: { role: 'TRAINER' } });
    const totalParticipants = await User.count({ where: { role: 'PARTICIPANT' } });
    const totalEnrollments = await Enrollment.count({ where: { status: 'ENROLLED' } });
    const totalFeedbacks = await Feedback.count();
    
    // Pending counts
    const pendingParticipants = await User.count({ 
      where: { role: 'PARTICIPANT', status: 'PENDING' } 
    });
    const { Note } = require('../models');
    const pendingNotes = await Note.count({ where: { status: 'PENDING' } });
    
    // Completed trainings (trainings that have ended)
    const now = new Date();
    const completedTrainings = await Training.count({
      where: { endDate: { [require('sequelize').Op.lt]: now } }
    });
    const activeTrainings = totalTrainings - completedTrainings;

    // Feedback stats
    const feedbacks = await Feedback.findAll({ 
      attributes: ['trainerRating', 'subjectRating'] 
    });
    const avgTrainerRating = feedbacks.length > 0
      ? (feedbacks.reduce((s, f) => s + f.trainerRating, 0) / feedbacks.length).toFixed(1) : 0;
    const avgSubjectRating = feedbacks.length > 0
      ? (feedbacks.reduce((s, f) => s + f.subjectRating, 0) / feedbacks.length).toFixed(1) : 0;
    const satisfactionScore = feedbacks.length > 0
      ? (((parseFloat(avgTrainerRating) + parseFloat(avgSubjectRating)) / 2)).toFixed(1)
      : 0;

    // Rating distribution (for charts)
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => {
      ratingDistribution[f.trainerRating] = (ratingDistribution[f.trainerRating] || 0) + 1;
    });

    // Enrollment rate
    const enrollmentRate = totalParticipants > 0 
      ? ((totalEnrollments / totalParticipants) * 100).toFixed(1) 
      : 0;

    res.json({ 
      success: true,
      // Flat properties for backward compatibility
      totalTrainings,
      completedTrainings,
      activeTrainings,
      totalTrainers,
      totalParticipants,
      pendingParticipants,
      totalEnrollments,
      totalFeedbacks,
      pendingNotes,
      avgTrainerRating,
      avgSubjectRating,
      satisfactionScore,
      ratingDistribution,
      enrollmentRate,
      // New data wrapper
      data: {
        totalTrainings,
        completedTrainings,
        activeTrainings,
        totalTrainers,
        totalParticipants,
        pendingParticipants,
        totalEnrollments,
        totalFeedbacks,
        pendingNotes,
        avgTrainerRating,
        avgSubjectRating,
        satisfactionScore,
        ratingDistribution,
        enrollmentRate
      }
    });

  } catch (error) {
    console.error('Get stats error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching stats' 
    });
  }
};

const getParticipants = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { search = '', status = '', limit = 50, offset = 0 } = req.query;
    
    const where = { role: 'PARTICIPANT' };
    
    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Status filter
    if (status) {
      where.status = status;
    }

    const participants = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await User.count({ where });

    const formattedParticipants = participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      username: p.username,
      status: p.status,
      joinedAt: p.createdAt || p.dataValues?.created_at
    }));

    res.json({ 
      success: true,
      participants: formattedParticipants,
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });

  } catch (error) {
    console.error('Get participants error:', error.message, error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Server error fetching participants' 
    });
  }
};

const sendReminders = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const training = await Training.findByPk(trainingId);
    if (!training) return res.status(404).json({ error: 'Training not found' });

    const enrollments = await Enrollment.findAll({
      where: { trainingId, status: 'ENROLLED' },
      attributes: ['participantId']
    });

    const participantIds = enrollments.map(e => e.participantId);
    const feedbacks = await Feedback.findAll({
      where: { trainingId },
      attributes: ['participantId']
    });
    const submittedIds = feedbacks.map(f => f.participantId);
    const pendingIds = participantIds.filter(id => !submittedIds.includes(id));

    if (pendingIds.length === 0) {
      return res.json({ message: 'No pending feedbacks for this training.' });
    }

    const notifications = pendingIds.map(userId => ({
      userId,
      message: `Reminder: Please submit your feedback for the training "${training.title}".`,
      isRead: false
    }));

    await Notification.bulkCreate(notifications);
    res.json({ message: `Sent ${notifications.length} reminders.` });
  } catch (error) {
    console.error('Send reminders error:', error.message);
    res.status(500).json({ error: 'Server error sending reminders' });
  }
};

const deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await User.findOne({ where: { id, role: 'PARTICIPANT' } });
    if (!participant) return res.status(404).json({ error: 'Participant not found' });
    await Enrollment.destroy({ where: { participantId: id } });
    await Feedback.destroy({ where: { participantId: id } });
    await User.destroy({ where: { id } });
    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Delete participant error:', error.message);
    res.status(500).json({ error: 'Server error deleting participant' });
  }
};

const exportFeedbacksCSV = async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({
      include: [
        { model: Training, as: 'training', attributes: ['id', 'title'], include: [{ model: User, as: 'trainer', attributes: ['name'] }] },
        { model: User, as: 'participant', attributes: ['id', 'name', 'email'] }
      ],
      order: [['submitted_at', 'DESC']]
    });

    const rows = [
      ['ID', 'Training', 'Trainer', 'Participant', 'Trainer Rating', 'Subject Rating', 'Comments', 'Anonymous', 'Date'].join(',')
    ];
    feedbacks.forEach(f => {
      const pName = f.anonymous ? 'Anonymous' : (f.participant?.name || '');
      const row = [
        f.id,
        `"${f.training?.title || ''}"`,
        `"${f.training?.trainer?.name || ''}"`,
        `"${pName}"`,
        f.trainerRating,
        f.subjectRating,
        `"${(f.comments || '').replace(/"/g, "'")}"`,
        f.anonymous ? 'Yes' : 'No',
        f.submitted_at ? new Date(f.submitted_at).toLocaleDateString('en-IN') : ''
      ].join(',');
      rows.push(row);
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback_export.csv"');
    res.send(rows.join('\n'));
  } catch (error) {
    console.error('Export CSV error:', error.message);
    res.status(500).json({ error: 'Server error exporting feedbacks' });
  }
};

const getTrainingStats = async (req, res) => {
  try {
    const trainings = await Training.findAll({
      include: [{ model: User, as: 'trainer', attributes: ['name'], required: false }],
      order: [['id', 'DESC']]
    });

    const result = await Promise.all(trainings.map(async t => {
      const enrolledCount = await Enrollment.count({ where: { trainingId: t.id, status: 'ENROLLED' } });
      const feedbackCount = await Feedback.count({ where: { trainingId: t.id } });
      const feedbacks = await Feedback.findAll({ where: { trainingId: t.id }, attributes: ['trainerRating', 'subjectRating'] });
      const avgTrainer = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.trainerRating, 0) / feedbacks.length).toFixed(1) : null;
      const avgSubject = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.subjectRating, 0) / feedbacks.length).toFixed(1) : null;
      const now = new Date();
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const status = now < start ? 'Upcoming' : now > end ? 'Completed' : 'Ongoing';
      return {
        id: t.id, title: t.title, trainerName: t.trainer?.name || 'Unassigned',
        startDate: t.startDate, endDate: t.endDate, capacity: t.capacity,
        enrolledCount, feedbackCount, avgTrainerRating: avgTrainer, avgSubjectRating: avgSubject, status
      };
    }));

    res.json({ trainings: result });
  } catch (error) {
    console.error('Training stats error:', error.message);
    res.status(500).json({ error: 'Server error fetching training stats' });
  }
};

const getPendingParticipants = async (req, res) => {
  try {
    const pendingParticipants = await User.findAll({
      where: { role: 'PARTICIPANT', status: 'PENDING' },
      attributes: { exclude: ['password'] },
      order: [['id', 'DESC']]
    });

    const formattedParticipants = pendingParticipants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      username: p.username,
      appliedAt: p.createdAt
    }));

    res.json({ participants: formattedParticipants, total: formattedParticipants.length });
  } catch (error) {
    console.error('Get pending participants error:', error.message);
    res.status(500).json({ error: 'Server error fetching pending participants' });
  }
};

const approveParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await User.findOne({ where: { id, role: 'PARTICIPANT', status: 'PENDING' } });
    
    if (!participant) {
      return res.status(404).json({ error: 'Pending participant not found' });
    }

    await participant.update({ status: 'APPROVED' });

    const io = req.app.get('io');

    // Log activity
    await ActivityService.logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Admin',
      action: 'USER_APPROVED',
      entityType: 'User',
      entityId: participant.id,
      details: { targetUserName: participant.name }
    }, io);

    // Notify user
    await Notification.create({
      userId: participant.id,
      message: 'Your account has been approved. You can now log in.',
      type: 'APPROVAL',
      isRead: false
    });

    res.json({
      message: 'Participant approved successfully',
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        status: participant.status
      }
    });
  } catch (error) {
    console.error('Approve participant error:', error.message);
    res.status(500).json({ error: 'Server error approving participant' });
  }
};

const rejectParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await User.findOne({ where: { id, role: 'PARTICIPANT', status: 'PENDING' } });
    
    if (!participant) {
      return res.status(404).json({ error: 'Pending participant not found' });
    }

    // Delete all related data
    await Enrollment.destroy({ where: { participantId: id } });
    await Feedback.destroy({ where: { participantId: id } });
    await User.destroy({ where: { id } });

    res.json({ message: 'Participant rejected and removed successfully' });
  } catch (error) {
    console.error('Reject participant error:', error.message);
    res.status(500).json({ error: 'Server error rejecting participant' });
  }
};

module.exports = { updateTraining, deleteTraining, updateTrainer, deleteTrainer, getStats, getParticipants, sendReminders, deleteParticipant, exportFeedbacksCSV, getTrainingStats, getPendingParticipants, approveParticipant, rejectParticipant };