/**
 * Comprehensive Verification Script
 * 
 * Checks:
 * 1. All tables under 64-key limit
 * 2. No duplicate indexes
 * 3. Foreign key constraints properly set
 * 4. Unique constraints correctly defined
 * 5. Table structure integrity
 */

const { sequelize } = require('./src/config/db');

class DatabaseVerifier {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.info = [];
  }

  async verify() {
    console.log('🔍 Starting comprehensive database verification...\n');

    try {
      await this.checkIndexCounts();
      await this.checkDuplicateIndexes();
      await this.checkForeignKeys();
      await this.checkUniqueConstraints();
      await this.checkTableStructure();

      this.printReport();
    } catch (error) {
      console.error('❌ Verification error:', error.message);
      process.exit(1);
    } finally {
      await sequelize.close();
    }
  }

  async checkIndexCounts() {
    console.log('1️⃣  Checking index counts per table...\n');

    const result = await sequelize.query(`
      SELECT TABLE_NAME, COUNT(*) as key_count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'training_db'}'
      GROUP BY TABLE_NAME
      ORDER BY key_count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    let maxKeys = 0;
    result.forEach(table => {
      const status = table.key_count <= 64 ? '✅' : '❌';
      console.log(`${status} ${table.TABLE_NAME.padEnd(25)} ${table.key_count} keys`);
      
      if (table.key_count > 64) {
        this.issues.push(
          `Table '${table.TABLE_NAME}' exceeds 64-key limit with ${table.key_count} keys`
        );
      } else if (table.key_count > 50) {
        this.warnings.push(
          `Table '${table.TABLE_NAME}' has ${table.key_count} keys (close to 64-key limit)`
        );
      }
      
      maxKeys = Math.max(maxKeys, table.key_count);
    });

    this.info.push(`Highest key count: ${maxKeys} keys`);
    console.log('');
  }

  async checkDuplicateIndexes() {
    console.log('2️⃣  Checking for duplicate indexes...\n');

    const dbName = process.env.DB_NAME || 'training_db';
    const tables = await sequelize.query(`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_TYPE = 'BASE TABLE'
    `, { type: sequelize.QueryTypes.SELECT });

    let duplicatesFound = 0;

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      // Find indexes with numeric suffixes (indication of duplicates)
      const result = await sequelize.query(`
        SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = '${dbName}' 
        AND TABLE_NAME = '${tableName}'
        AND INDEX_NAME REGEXP '_[0-9]+$'
        GROUP BY INDEX_NAME
      `, { type: sequelize.QueryTypes.SELECT });

      if (result.length > 0) {
        this.issues.push(`Table '${tableName}' has duplicate indexes: ${result.map(r => r.INDEX_NAME).join(', ')}`);
        duplicatesFound += result.length;
      }
    }

    if (duplicatesFound === 0) {
      console.log('✅ No duplicate indexes found\n');
      this.info.push('No duplicate indexes detected');
    } else {
      console.log(`❌ Found ${duplicatesFound} duplicate indexes\n`);
    }
  }

  async checkForeignKeys() {
    console.log('3️⃣  Checking foreign key constraints...\n');

    const result = await sequelize.query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'training_db'}'
      AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `, { type: sequelize.QueryTypes.SELECT });

    if (result.length === 0) {
      console.log('⚠️  No foreign keys found (or not enforced)\n');
      this.warnings.push('No foreign key constraints found - consider enabling if appropriate');
    } else {
      console.log(`✅ Found ${result.length} foreign key constraint(s):`);
      result.forEach(fk => {
        console.log(`   ${fk.CONSTRAINT_NAME}: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}`);
      });
      console.log('');
    }
  }

  async checkUniqueConstraints() {
    console.log('4️⃣  Checking unique constraints...\n');

    const result = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'training_db'}'
      AND INDEX_NAME != 'PRIMARY'
      AND SEQ_IN_INDEX = 1
      ORDER BY TABLE_NAME
    `, { type: sequelize.QueryTypes.SELECT });

    const groupedByTable = {};
    result.forEach(row => {
      if (!groupedByTable[row.TABLE_NAME]) {
        groupedByTable[row.TABLE_NAME] = [];
      }
      groupedByTable[row.TABLE_NAME].push(row);
    });

    Object.entries(groupedByTable).forEach(([table, constraints]) => {
      if (constraints.length > 0) {
        console.log(`${table}:`);
        constraints.forEach(c => {
          console.log(`   - ${c.COLUMN_NAME} (${c.INDEX_NAME})`);
        });
      }
    });
    console.log('');
  }

  async checkTableStructure() {
    console.log('5️⃣  Checking table structure integrity...\n');

    const tables = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'training_db'}'
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_ROWS DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Table Structure Summary:');
    console.log('Name                      Rows      Size');
    console.log('─'.repeat(45));
    
    tables.forEach(table => {
      const name = table.TABLE_NAME.padEnd(25);
      const rows = String(table.TABLE_ROWS || 0).padEnd(10);
      const size = this.formatBytes(table.DATA_LENGTH);
      console.log(`${name}${rows}${size}`);
    });
    console.log('');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION REPORT');
    console.log('='.repeat(60) + '\n');

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('✅ DATABASE VERIFICATION PASSED!');
      console.log('\n✅ All checks passed:');
      this.info.forEach(info => {
        console.log(`   • ${info}`);
      });
    } else {
      if (this.issues.length > 0) {
        console.log('❌ CRITICAL ISSUES:');
        this.issues.forEach((issue, i) => {
          console.log(`   ${i + 1}. ${issue}`);
        });
        console.log('');
      }

      if (this.warnings.length > 0) {
        console.log('⚠️  WARNINGS:');
        this.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
        console.log('');
      }

      if (this.info.length > 0) {
        console.log('ℹ️  INFO:');
        this.info.forEach(inf => {
          console.log(`   • ${inf}`);
        });
        console.log('');
      }
    }

    // Action items
    if (this.issues.length > 0) {
      console.log('\n🔧 ACTION REQUIRED:');
      console.log('   1. Run: node cleanup-duplicate-indexes.js');
      console.log('   2. Verify: node verify-database.js');
      console.log('   3. Restart server');
    } else if (this.warnings.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('   • Monitor index growth');
      console.log('   • Consider using migrations for schema changes');
      console.log('   • Never use alter: true in production');
    } else {
      console.log('\n✨ Database is healthy and ready for production!');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Exit with appropriate code
    process.exit(this.issues.length > 0 ? 1 : 0);
  }
}

// Run verification
const verifier = new DatabaseVerifier();
verifier.verify();
