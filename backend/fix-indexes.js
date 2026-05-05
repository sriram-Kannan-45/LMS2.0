const { sequelize } = require('./src/config/db');

async function fixIndexes() {
  try {
    // Drop duplicate indexes (keep only the main ones)
    const indexesToDrop = [];
    
    for (let i = 2; i <= 31; i++) {
      indexesToDrop.push(`email_${i}`);
      indexesToDrop.push(`username_${i}`);
    }
    
    console.log('Dropping duplicate indexes...');
    
    for (const idxName of indexesToDrop) {
      try {
        await sequelize.query(`DROP INDEX \`${idxName}\` ON \`users\``);
        console.log(`  Dropped: ${idxName}`);
      } catch (e) {
        // Index might not exist, ignore
      }
    }
    
    console.log('\nVerifying remaining indexes...');
    const rows = await sequelize.query(
      "SELECT INDEX_NAME, COUNT(*) as col_count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'training_db' AND TABLE_NAME = 'users' GROUP BY INDEX_NAME",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Remaining indexes:');
    rows.forEach(r => console.log(' -', r.INDEX_NAME));
    console.log('\nTotal:', rows.length);
    
    await sequelize.close();
    console.log('\nDone!');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

fixIndexes();
