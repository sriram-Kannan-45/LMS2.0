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
    },
    define: {
      freezeTableName: true // Prevent automatic table name pluralization
    }
  }
);

const createDatabase = async () => {
  try {
    const tempSeq = new Sequelize('mysql', dbUser, dbPass, { 
      host: dbHost, 
      dialect: 'mysql', 
      logging: false,
      define: { freezeTableName: true }
    });
    await tempSeq.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created or already exists`);
    await tempSeq.close();
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
  }
};

const connectDB = async () => {
  try {
    await createDatabase();
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRODUCTION-READY SYNC CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════
    // 
    // `alter: false` - CRITICAL: Prevents repeated index creation
    //   ✅ Do NOT use `alter: true` - causes duplicate indexes
    //   Why? Each sync iteration tries to "fix" the table, creating:
    //   - email, email_1, email_2, email_3... up to email_31
    //   - username, username_1, username_2... up to username_31
    //   Result: 60+ duplicate indexes → exceeds MySQL's 64-key limit
    //
    // `force: false` - Do NOT drop and recreate tables
    //   ✅ Prevents data loss
    //   ❌ force: true deletes ALL data - never use in production
    //
    // For safe schema changes in production:
    //   → Use Sequelize migrations (sequelize-cli with umzug)
    //   → OR: Manual SQL scripts with version control
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // ── Pre-sync cleanup: drop quiz_assignments if it still has the OLD schema ──
    // The model now uses participant_id + status; old table has training_id instead.
    // If we don't drop it here, Sequelize will try ALTER TABLE to add the index
    // (quiz_id, participant_id) and fail because participant_id doesn't exist yet.
    try {
      const [oldCols] = await sequelize.query("SHOW COLUMNS FROM `quiz_assignments`");
      const oldColNames = oldCols.map(c => c.Field);
      if (oldColNames.includes('training_id') && !oldColNames.includes('participant_id')) {
        console.log('♻️ Dropping old-format quiz_assignments (has training_id, needs participant_id)...');
        await sequelize.query("DROP TABLE IF EXISTS quiz_assignments");
      }
    } catch (_) {
      // Table doesn't exist yet — nothing to clean up
    }

    console.log('📊 Syncing database schema...');
    await sequelize.sync({ 
      alter: false,  // ✅ CRITICAL: Do not alter - causes duplicate indexes
      force: false,  // ✅ CRITICAL: Do not drop - causes data loss
      logging: false
    });
    console.log('✅ Database schema verified');
    
    // Manual database migration for ai_questions to support new quiz question formats
    try {
      const [columns] = await sequelize.query("SHOW COLUMNS FROM `ai_questions`");
      const columnNames = columns.map(c => c.Field);
      
      // Check and add acceptable_answers column
      if (!columnNames.includes('acceptable_answers')) {
        console.log('➕ Adding acceptable_answers column to ai_questions...');
        await sequelize.query("ALTER TABLE `ai_questions` ADD COLUMN `acceptable_answers` JSON NULL COMMENT 'Acceptable answers for FILL_BLANK'");
      }
      
      // Check and add pairs column
      if (!columnNames.includes('pairs')) {
        console.log('➕ Adding pairs column to ai_questions...');
        await sequelize.query("ALTER TABLE `ai_questions` ADD COLUMN `pairs` JSON NULL COMMENT 'Pairs for MATCHING question type'");
      }

      if (!columnNames.includes('topic')) {
        console.log('Adding topic column to ai_questions...');
        await sequelize.query("ALTER TABLE `ai_questions` ADD COLUMN `topic` VARCHAR(255) NULL");
      }

      if (!columnNames.includes('blooms_level')) {
        console.log('Adding blooms_level column to ai_questions...');
        await sequelize.query("ALTER TABLE `ai_questions` ADD COLUMN `blooms_level` VARCHAR(64) NULL");
      }

      if (!columnNames.includes('marks')) {
        console.log('Adding marks column to ai_questions...');
        await sequelize.query("ALTER TABLE `ai_questions` ADD COLUMN `marks` INT NOT NULL DEFAULT 1 COMMENT 'Points this question is worth'");
      }
      
      // Check and update question_type enum column
      const questionTypeCol = columns.find(c => c.Field === 'question_type');
      if (questionTypeCol) {
        const typeStr = String(questionTypeCol.Type).toUpperCase();
        if (!typeStr.includes('TRUE_FALSE') || !typeStr.includes('FILL_BLANK') || !typeStr.includes('MATCHING')) {
          console.log('🔄 Updating question_type ENUM values in ai_questions...');
          await sequelize.query("ALTER TABLE `ai_questions` MODIFY COLUMN `question_type` ENUM('MCQ', 'SHORT_ANSWER', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING') NOT NULL");
        }
      }

      // Manual migration: Ensure unique constraint UNIQUE(participant_id, quiz_id) on quiz_attempts
      try {
        console.log('📊 Running manual migration for quiz_attempts uniqueness constraint...');
        
        // 1. Delete duplicate attempts if they exist, keeping the earliest created one.
        await sequelize.query(`
          DELETE q1 FROM quiz_attempts q1
          INNER JOIN quiz_attempts q2 
          WHERE q1.id > q2.id 
            AND q1.participant_id = q2.participant_id 
            AND q1.quiz_id = q2.quiz_id
        `);
        
        // 2. Check if the unique index 'idx_participant_quiz_unique' already exists
        const [indices] = await sequelize.query(`
          SELECT INDEX_NAME 
          FROM INFORMATION_SCHEMA.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'quiz_attempts' 
            AND INDEX_NAME = 'idx_participant_quiz_unique' 
          LIMIT 1
        `);
        
        if (indices.length === 0) {
          console.log('➕ Adding unique index idx_participant_quiz_unique to quiz_attempts...');
          await sequelize.query("ALTER TABLE `quiz_attempts` ADD UNIQUE INDEX `idx_participant_quiz_unique` (`participant_id`, `quiz_id`)");
        } else {
          console.log('✅ Unique index idx_participant_quiz_unique already exists on quiz_attempts');
        }
      } catch (idxError) {
        console.error('⚠️ Error migrating quiz_attempts unique index:', idxError.message);
      }

      // Manual database migration for ai_quizzes to support full lifecycle
      try {
        const [columns] = await sequelize.query("SHOW COLUMNS FROM `ai_quizzes`");
        const columnNames = columns.map(c => c.Field);
        
        if (!columnNames.includes('is_published')) {
          console.log('➕ Adding is_published column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `is_published` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!columnNames.includes('is_result_published')) {
          console.log('➕ Adding is_result_published column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `is_result_published` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!columnNames.includes('published_at')) {
          console.log('➕ Adding published_at column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `published_at` TIMESTAMP NULL");
        }
        if (!columnNames.includes('result_published_at')) {
          console.log('➕ Adding result_published_at column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `result_published_at` TIMESTAMP NULL");
        }

        // ── New lifecycle columns ──
        if (!columnNames.includes('start_time')) {
          console.log('➕ Adding start_time column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `start_time` TIMESTAMP NULL");
        }
        if (!columnNames.includes('end_time')) {
          console.log('➕ Adding end_time column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `end_time` TIMESTAMP NULL");
        }
        if (!columnNames.includes('closed_at')) {
          console.log('➕ Adding closed_at column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `closed_at` TIMESTAMP NULL");
        }
        if (!columnNames.includes('total_marks')) {
          console.log('➕ Adding total_marks column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `total_marks` DECIMAL(10,2) NOT NULL DEFAULT 0");
        }
        if (!columnNames.includes('allow_multiple_attempts')) {
          console.log('➕ Adding allow_multiple_attempts column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `allow_multiple_attempts` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!columnNames.includes('max_attempts')) {
          console.log('➕ Adding max_attempts column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `max_attempts` INT NOT NULL DEFAULT 1");
        }
        if (!columnNames.includes('show_result_immediately')) {
          console.log('➕ Adding show_result_immediately column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `show_result_immediately` TINYINT(1) NOT NULL DEFAULT 0");
        }
        if (!columnNames.includes('show_correct_answers_on_result')) {
          console.log('➕ Adding show_correct_answers_on_result column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `show_correct_answers_on_result` TINYINT(1) NOT NULL DEFAULT 1");
        }
        if (!columnNames.includes('shuffle_questions')) {
          console.log('➕ Adding shuffle_questions column to ai_quizzes...');
          await sequelize.query("ALTER TABLE `ai_quizzes` ADD COLUMN `shuffle_questions` TINYINT(1) NOT NULL DEFAULT 0");
        }

        // Update status ENUM — MySQL doesn't support DROP ENUM VALUE, so we
        // MODIFY the column to include RESULTS_PUBLISHED, ARCHIVED.
        const statusCol = columns.find(c => c.Field === 'status');
        if (statusCol) {
          const typeStr = String(statusCol.Type).toUpperCase();
          if (!typeStr.includes('RESULTS_PUBLISHED')) {
            console.log('🔄 Updating status ENUM to include RESULTS_PUBLISHED, ARCHIVED...');
            await sequelize.query(
              "ALTER TABLE `ai_quizzes` MODIFY COLUMN `status` ENUM('DRAFT','PUBLISHED','CLOSED','RESULTS_PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT'"
            );
          }
        }

        // Backward-compat booleans sync
        try {
          await sequelize.query(`
            UPDATE ai_quizzes SET is_published = 1, published = 1 WHERE status IN ('PUBLISHED','CLOSED','RESULTS_PUBLISHED')
          `);
          await sequelize.query(`
            UPDATE ai_quizzes SET is_result_published = 1, resultStatus = 'PUBLISHED' WHERE status = 'RESULTS_PUBLISHED'
          `);
        } catch (_) {}
      } catch (migQuizError) {
        console.error('⚠️ Error applying manual schema migrations to ai_quizzes:', migQuizError.message);
      }

      // Manual migration: quiz_assignments table (per-participant assignment with status)
      try {
        const [tables] = await sequelize.query("SHOW TABLES LIKE 'quiz_assignments'");
        if (tables.length === 0) {
          console.log('➕ Creating quiz_assignments table...');
          await sequelize.query(`
            CREATE TABLE quiz_assignments (
              id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
              quiz_id BIGINT UNSIGNED NOT NULL,
              participant_id BIGINT UNSIGNED NOT NULL,
              status ENUM('PENDING','COMPLETED') NOT NULL DEFAULT 'PENDING',
              assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE INDEX idx_quiz_participant_unique (quiz_id, participant_id),
              INDEX idx_quiz_id (quiz_id),
              INDEX idx_participant_id (participant_id),
              INDEX idx_status (status),
              CONSTRAINT fk_qa_quiz FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id) ON DELETE CASCADE,
              CONSTRAINT fk_qa_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
        } else {
          // Check if old schema (with training_id) — if so, drop and recreate
          try {
            const [cols] = await sequelize.query("SHOW COLUMNS FROM `quiz_assignments`");
            const colNames = cols.map(c => c.Field);
            if (colNames.includes('training_id') && !colNames.includes('participant_id')) {
              console.log('♻️ Recreating quiz_assignments table with new schema...');
              await sequelize.query("DROP TABLE IF EXISTS quiz_assignments");
              await sequelize.query(`
                CREATE TABLE quiz_assignments (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                  quiz_id BIGINT UNSIGNED NOT NULL,
                  participant_id BIGINT UNSIGNED NOT NULL,
                  status ENUM('PENDING','COMPLETED') NOT NULL DEFAULT 'PENDING',
                  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  UNIQUE INDEX idx_quiz_participant_unique (quiz_id, participant_id),
                  INDEX idx_quiz_id (quiz_id),
                  INDEX idx_participant_id (participant_id),
                  INDEX idx_status (status),
                  CONSTRAINT fk_qa_quiz FOREIGN KEY (quiz_id) REFERENCES ai_quizzes(id) ON DELETE CASCADE,
                  CONSTRAINT fk_qa_participant FOREIGN KEY (participant_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
              `);
            } else {
              console.log('✅ quiz_assignments table already has correct schema');
            }
          } catch (checkErr) {
            console.error('⚠️ Error checking quiz_assignments schema:', checkErr.message);
          }
        }
      } catch (qaError) {
        console.error('⚠️ Error creating quiz_assignments table:', qaError.message);
      }

      console.log('✅ Manual schema migration checks completed successfully');
    } catch (migError) {
      console.error('⚠️ Error applying manual schema migrations to ai_questions:', migError.message);
    }
    
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Helpful error message for "too many keys" issue
    if (error.message && error.message.includes('Too many keys specified')) {
      console.error('\n⚠️  DUPLICATE INDEX DETECTION:');
      console.error('   The error "Too many keys specified; max 64 keys allowed"');
      console.error('   indicates duplicate indexes in the database.');
      console.error('\n💡 SOLUTION:');
      console.error('   1. Run: node cleanup-duplicate-indexes.js');
      console.error('   2. Verify all tables show ✅ (under 64 keys)');
      console.error('   3. Restart the server');
      console.error('   4. Never use alter: true in production\n');
    }
    
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
