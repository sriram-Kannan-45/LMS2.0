require('dotenv').config();

const { Sequelize } = require('sequelize');

const dbName = process.env.DB_NAME || 'training_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '';
const dbHost = process.env.DB_HOST || 'localhost';

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPass,
  {
    host: dbHost,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const createDatabase = async () => {
  try {
    const tempSeq = new Sequelize('mysql', dbUser, dbPass, { host: dbHost, dialect: 'mysql', logging: false });
    await tempSeq.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created or already exists`);
    await tempSeq.close();
  } catch (error) {
    console.error('Error creating database:', error.message);
  }
};

const connectDB = async () => {
  try {
    await createDatabase();
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Use alter: false to prevent duplicate index creation
    // Use force: false and match: true for safer sync
    await sequelize.sync({ alter: false, logging: false });
    console.log('✅ Tables synced');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };