const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'training_db';
const dbUser = process.env.DB_USER || 'root';
const dbPass = process.env.DB_PASS || '1234';
const dbHost = process.env.DB_HOST || 'localhost';

const resetDatabase = async () => {
  const tempSeq = new Sequelize('mysql', dbUser, dbPass, { host: dbHost, dialect: 'mysql', logging: console.log });
  
  try {
    console.log('🔄 Dropping database...');
    await tempSeq.query(`DROP DATABASE IF EXISTS ${dbName}`);
    
    console.log('🔄 Creating clean database...');
    await tempSeq.query(`CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    console.log('✅ Database reset complete');
    await tempSeq.close();
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  }
};

resetDatabase();