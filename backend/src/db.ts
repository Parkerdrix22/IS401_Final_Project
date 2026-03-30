import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function parseLegacyEnvValue(pattern: RegExp): string | null {
  if (!fs.existsSync(envPath)) return null;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(pattern);
  return match ? String(match[1]).trim() : null;
}

const host = process.env.DB_HOST || process.env.RDSHOST || parseLegacyEnvValue(/RDSHOST="([^"]+)"/) || '';
const port = Number(process.env.DB_PORT || process.env.PGPORT || parseLegacyEnvValue(/\bport=(\d+)/) || 5432);
const database = process.env.DB_NAME || process.env.PGDATABASE || parseLegacyEnvValue(/\bdbname=([^\s"]+)/) || 'postgres';
const user = process.env.DB_USER || process.env.PGUSER || parseLegacyEnvValue(/\buser=([^\s"]+)/) || 'postgres';
const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || parseLegacyEnvValue(/\bpassword=([^\s"]+)/) || '';

const sslEnabled = String(process.env.DB_SSL || 'true').toLowerCase() !== 'false';
const sslCertPath = process.env.DB_SSL_CERT || parseLegacyEnvValue(/\bsslrootcert=([^\s"]+)/) || '';

let ssl: false | { rejectUnauthorized?: boolean; ca?: string } = false;
if (sslEnabled) {
  ssl = { rejectUnauthorized: false };
  if (sslCertPath && fs.existsSync(sslCertPath)) {
    ssl = { ca: fs.readFileSync(sslCertPath, 'utf-8') };
  }
}

export const pool = new Pool({
  host,
  port,
  database,
  user,
  password,
  ssl,
});
