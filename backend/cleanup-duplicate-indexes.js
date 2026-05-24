/**
 * Cleanup Script for Duplicate Indexes
 * 
 * This script removes duplicate indexes that Sequelize created
 * during multiple sync operations with `alter: true`.
 * 
 * Issue: MySQL allows max 64 keys (indexes) per table
 * Root Cause: Repeated sequelize.sync({ alter: true }) creates indexes multiple times
 */

const { sequelize } = require('./src/config/db');

async function cleanupDuplicateIndexes() {
  try {
    console.log('🔍 Starting duplicate index cleanup...\n');

    // Get all tables in the database
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'training_db'}'
       AND TABLE_TYPE = 'BASE TABLE'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      // Get all indexes for this table
      const indexes = await sequelize.query(
        `SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX 
         FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'training_db'}' 
         AND TABLE_NAME = '${tableName}'
         ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
        { type: sequelize.QueryTypes.SELECT }
      );

      if (indexes.length === 0) continue;

      // Group indexes by name
      const indexMap = {};
      indexes.forEach(idx => {
        if (!indexMap[idx.INDEX_NAME]) {
          indexMap[idx.INDEX_NAME] = [];
        }
        indexMap[idx.INDEX_NAME].push(idx.COLUMN_NAME);
      });

      // Find duplicates: if two indexes have the same columns, keep one
      const indexedColumns = {};
      const toDelete = [];

      Object.entries(indexMap).forEach(([indexName, columns]) => {
        const columnKey = columns.join(',');
        if (!indexedColumns[columnKey]) {
          indexedColumns[columnKey] = indexName;
        } else {
          // Keep the shorter name (usually the first one created by Sequelize)
          const existing = indexedColumns[columnKey];
          const shouldDelete = indexName.length > existing.length ? indexName : existing;
          toDelete.push(shouldDelete);
          if (shouldDelete === existing) {
            indexedColumns[columnKey] = indexName;
          }
        }
      });

      // Delete duplicate indexes
      if (toDelete.length > 0) {
        console.log(`📋 Table: ${tableName}`);
        for (const idxName of toDelete) {
          // Skip PRIMARY key
          if (idxName === 'PRIMARY') continue;

          try {
            await sequelize.query(`DROP INDEX \`${idxName}\` ON \`${tableName}\``);
            console.log(`  ✅ Dropped: ${idxName}`);
          } catch (err) {
            if (err.message.includes('Duplicate key name')) {
              console.log(`  ⚠️ Skipped (already dropped): ${idxName}`);
            } else {
              console.log(`  ❌ Error dropping ${idxName}: ${err.message}`);
            }
          }
        }
        console.log('');
      }
    }

    console.log('✅ Duplicate index cleanup completed!\n');

    // Show summary
    console.log('📊 Current index summary:\n');
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      const result = await sequelize.query(
        `SELECT COUNT(*) as index_count FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'training_db'}' 
         AND TABLE_NAME = '${tableName}'`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      const count = result[0].index_count;
      const status = count <= 64 ? '✅' : '⚠️';
      console.log(`${status} ${tableName}: ${count} keys${count > 64 ? ' (EXCEEDS LIMIT!)' : ''}`);
    }

    console.log('\n✨ Done!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

cleanupDuplicateIndexes();
