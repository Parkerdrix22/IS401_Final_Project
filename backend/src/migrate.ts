/**
 * Migrations — safe to re-run (each step is idempotent).
 *
 * Run:  npm run migrate
 *
 * Steps:
 *  1. Widen passwordhash VARCHAR(50) → VARCHAR(60) for bcrypt hashes.
 *  2. Add UNIQUE constraint on users.username (prevents duplicate accounts).
 *  3. Add UNIQUE constraint on users.email   (prevents duplicate accounts).
 *  4. Add starttime, endtime TIME columns to activitylogs.
 *  5. Add notes TEXT column to activitylogs.
 */
import { pool } from './db';

async function migrate() {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists
    `);
    if (!tableCheck.rows[0].exists) {
      console.error('Table "users" does not exist yet — run: npm run schema');
      process.exit(1);
    }

    await client.query('BEGIN');

    // 1. Widen passwordhash if still VARCHAR(50)
    const colCheck = await client.query(`
      SELECT character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'passwordhash'
    `);
    const currentLen = colCheck.rows[0]?.character_maximum_length;
    if (!currentLen || currentLen < 60) {
      await client.query(`ALTER TABLE users ALTER COLUMN passwordhash TYPE VARCHAR(60)`);
      console.log('✓ passwordhash widened to VARCHAR(60)');
    } else {
      console.log(`  passwordhash already ${currentLen} chars — skipped`);
    }

    // 2. Unique constraint on username
    const usernameIdx = await client.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'users' AND indexname = 'users_username_key'
    `);
    if (usernameIdx.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)`);
      console.log('✓ UNIQUE constraint added on users.username');
    } else {
      console.log('  users.username UNIQUE already exists — skipped');
    }

    // 3. Unique constraint on email
    const emailIdx = await client.query(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'users' AND indexname = 'users_email_key'
    `);
    if (emailIdx.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)`);
      console.log('✓ UNIQUE constraint added on users.email');
    } else {
      console.log('  users.email UNIQUE already exists — skipped');
    }

    // 4. Add starttime column to activitylogs
    const starttimeCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'activitylogs' AND column_name = 'starttime'
    `);
    if (starttimeCheck.rowCount === 0) {
      await client.query(`ALTER TABLE activitylogs ADD COLUMN starttime TIME`);
      console.log('✓ starttime column added to activitylogs');
    } else {
      console.log('  activitylogs.starttime already exists — skipped');
    }

    // 5. Add endtime column to activitylogs
    const endtimeCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'activitylogs' AND column_name = 'endtime'
    `);
    if (endtimeCheck.rowCount === 0) {
      await client.query(`ALTER TABLE activitylogs ADD COLUMN endtime TIME`);
      console.log('✓ endtime column added to activitylogs');
    } else {
      console.log('  activitylogs.endtime already exists — skipped');
    }

    // 6. Add notes column to activitylogs
    const notesCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'activitylogs' AND column_name = 'notes'
    `);
    if (notesCheck.rowCount === 0) {
      await client.query(`ALTER TABLE activitylogs ADD COLUMN notes TEXT`);
      console.log('✓ notes column added to activitylogs');
    } else {
      console.log('  activitylogs.notes already exists — skipped');
    }

    await client.query('COMMIT');
    console.log('All migrations complete.');
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
