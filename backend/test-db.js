const { sequelize } = require('./src/config/db');

async function testDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
    
    const [trainers] = await sequelize.query("SELECT COUNT(*) as count FROM users WHERE role = 'TRAINER'");
    console.log('Trainers count:', trainers[0].count);
    
    const [participants] = await sequelize.query("SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'");
    console.log('Participants count:', participants[0].count);
    
    const [allUsers] = await sequelize.query("SELECT id, name, email, role, status FROM users LIMIT 10");
    console.log('Users:', JSON.stringify(allUsers, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

testDB();
