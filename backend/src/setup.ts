/**
 * Applies schema and seed data to the database.
 *
 * Usage:
 *   npm run schema        — create all tables
 *   npm run seed          — insert seed rows
 *   npm run setup         — schema + seed + migrate in one go
 */
import * as fs from 'fs';
import * as path from 'path';
import { pool } from './db';

const ROOT = path.resolve(__dirname, '../../');

async function runFile(label: string, filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log(`✓ ${label} applied`);
  } catch (err: any) {
    console.error(`✗ ${label} failed: ${err.message}`);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function main() {
  const arg = process.argv[2] ?? 'all';

  if (arg === 'schema' || arg === 'all') {
    await runFile('schema', path.join(ROOT, 'schema-postgres.sql'));
  }
  if (arg === 'seed' || arg === 'all') {
    await runFile('seed', path.join(ROOT, 'seed-postgres.sql'));
  }
  if (arg === 'all') {
    // Also widen passwordhash if needed after schema is fresh
    const client = await pool.connect();
    try {
      await client.query(`ALTER TABLE users ALTER COLUMN passwordhash TYPE VARCHAR(60)`);
      console.log('✓ passwordhash widened to VARCHAR(60)');
    } catch (err: any) {
      // Ignore if already the right size
      if (!err.message.includes('no change')) {
        console.warn('  (passwordhash alter skipped:', err.message, ')');
      }
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main();
