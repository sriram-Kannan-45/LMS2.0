/**
 * wipe-except-admin.js
 *
 * Destructive: wipes ALL data in training_db EXCEPT rows in `users`
 * where role = 'ADMIN'.
 *
 * Strategy:
 *   1. Read every table from information_schema (no hard-coding).
 *   2. SET FOREIGN_KEY_CHECKS = 0
 *   3. TRUNCATE every table EXCEPT `users`.
 *   4. DELETE FROM users WHERE role <> 'ADMIN'.
 *   5. SET FOREIGN_KEY_CHECKS = 1
 *
 * Safety: requires `--yes` flag to actually run.
 *
 *   node scripts/wipe-except-admin.js          # dry-run, prints plan + counts
 *   node scripts/wipe-except-admin.js --yes    # actually wipes
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const DB = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'training_db',
  multipleStatements: false,
};

const CONFIRM = process.argv.includes('--yes');
const KEEP_TABLE = 'users';
const KEEP_WHERE = "role = 'ADMIN'"; // rows to preserve in users

(async () => {
  const conn = await mysql.createConnection(DB);
  console.log(`Connected to ${DB.user}@${DB.host}/${DB.database}`);

  // 1. Discover tables
  const [tables] = await conn.query(
    `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME`,
    [DB.database]
  );
  const names = tables.map(t => t.name);
  console.log(`Found ${names.length} tables.`);

  // 2. Counts before
  console.log('\n--- ROW COUNTS BEFORE ---');
  const before = {};
  for (const t of names) {
    const [[r]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
    before[t] = r.c;
    console.log(`  ${t.padEnd(30)} ${r.c}`);
  }

  // 3. Plan
  console.log('\n--- PLAN ---');
  for (const t of names) {
    if (t === KEEP_TABLE) {
      console.log(`  KEEP-FILTER  ${t}  (DELETE WHERE NOT (${KEEP_WHERE}))`);
    } else {
      console.log(`  TRUNCATE     ${t}`);
    }
  }

  if (!CONFIRM) {
    console.log('\nDry-run only. Re-run with --yes to apply.');
    await conn.end();
    return;
  }

  // 4. Execute
  console.log('\n--- EXECUTING ---');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const t of names) {
      if (t === KEEP_TABLE) continue;
      await conn.query(`TRUNCATE TABLE \`${t}\``);
      console.log(`  truncated ${t}`);
    }
    const [delRes] = await conn.query(
      `DELETE FROM \`${KEEP_TABLE}\` WHERE NOT (${KEEP_WHERE})`
    );
    console.log(`  deleted ${delRes.affectedRows} non-admin rows from ${KEEP_TABLE}`);
  } finally {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  // 5. Verify
  console.log('\n--- ROW COUNTS AFTER ---');
  for (const t of names) {
    const [[r]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
    const arrow = r.c === before[t] ? '=' : '→';
    console.log(`  ${t.padEnd(30)} ${String(before[t]).padStart(6)} ${arrow} ${r.c}`);
  }

  const [admins] = await conn.query(
    `SELECT id, name, email, role, status FROM users ORDER BY id`
  );
  console.log('\n--- REMAINING USERS (should be ADMIN only) ---');
  console.table(admins);

  await conn.end();
  console.log('\nDone.');
})().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
