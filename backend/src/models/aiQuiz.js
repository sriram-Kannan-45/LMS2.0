const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AIQuiz = sequelize.define('AIQuiz', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    field: 'document_id'
  },
  trainerId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    field: 'trainer_id'
  },
  trainingId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    field: 'training_id'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timeLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30,
    field: 'time_limit'
  },
  numQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'num_questions'
  },
  difficulty: {
    type: DataTypes.ENUM('EASY', 'MEDIUM', 'HARD', 'MIXED'),
    allowNull: false,
    defaultValue: 'MIXED'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'CLOSED'),
    allowNull: false,
    defaultValue: 'DRAFT'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'ai_quizzes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = AIQuiz;
