const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAPI() {
  try {
    console.log('Testing API endpoints...\n');
    
    // Test health endpoint
    console.log('1. Testing /health...');
    const health = await axios.get('http://localhost:3001/health');
    console.log('✅ Health:', health.data);
    
    // First login as admin
    console.log('\n2. Logging in as admin...');
    const login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    const token = login.data.token;
    console.log('✅ Login successful, token received');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test /api/admin/trainers
    console.log('\n3. Testing /api/admin/trainers...');
    try {
      const trainers = await axios.get(`${API_BASE}/admin/trainers`, { headers });
      console.log('✅ Trainers:', JSON.stringify(trainers.data, null, 2));
    } catch (e) {
      console.error('❌ Trainers error:', e.response?.data || e.message);
    }
    
    // Test /api/admin/participants
    console.log('\n4. Testing /api/admin/participants...');
    try {
      const participants = await axios.get(`${API_BASE}/admin/participants`, { headers });
      console.log('✅ Participants:', JSON.stringify(participants.data, null, 2));
    } catch (e) {
      console.error('❌ Participants error:', e.response?.data || e.message);
    }
    
    // Test /api/trainings
    console.log('\n5. Testing /api/trainings...');
    try {
      const trainings = await axios.get(`${API_BASE}/trainings`, { headers });
      console.log('✅ Trainings count:', trainings.data.trainings?.length || 0);
    } catch (e) {
      console.error('❌ Trainings error:', e.response?.data || e.message);
    }
    
    console.log('\n✅ API tests completed');
    process.exit(0);
  } catch (e) {
    console.error('❌ Test failed:', e.response?.data || e.message);
    process.exit(1);
  }
}

testAPI();
