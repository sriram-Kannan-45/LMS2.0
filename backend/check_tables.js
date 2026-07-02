const { sequelize } = require('./src/config/db');
(async () => {
  try {
    await sequelize.authenticate();
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'coding%'");
    console.log('Coding tables:', tables.map(t => Object.values(t)[0]));

    try {
      const [s] = await sequelize.query('SHOW CREATE TABLE coding_submissions');
      console.log('\n=== coding_submissions ===');
      console.log(s[0]['Create Table']);
    } catch(e) { console.log('coding_submissions:', e.message); }

    try {
      const [sr] = await sequelize.query('SHOW CREATE TABLE submission_results');
      console.log('\n=== submission_results ===');
      console.log(sr[0]['Create Table']);
    } catch(e) { console.log('submission_results:', e.message); }

    // Also check all foreign keys for submission_results if table exists
    try {
      const [fks] = await sequelize.query("SELECT * FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'submission_results'");
      console.log('\n=== submission_results constraints ===');
      console.log(fks);
    } catch(e) { console.log('constraints:', e.message); }

  } catch (e) {
    console.error('Auth Error:', e.message);
  } finally {
    await sequelize.close();
  }
})();
