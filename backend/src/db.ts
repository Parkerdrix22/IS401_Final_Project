import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

const hostMatch = envContent.match(/RDSHOST="([^"]+)"/);
const portMatch = envContent.match(/port=(\d+)/);
const dbnameMatch = envContent.match(/dbname=([^\s"]+)/);
const userMatch = envContent.match(/\buser=([^\s"]+)/);
const passwordMatch = envContent.match(/password=([^\s"]+)/);
const sslcertMatch = envContent.match(/sslrootcert=([^\s"]+)/);

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim() !== '')?.trim();
}

const host = firstDefined(process.env.DB_HOST, process.env.RDSHOST, hostMatch?.[1]) ?? '';
const port = Number(firstDefined(process.env.DB_PORT, process.env.PGPORT, portMatch?.[1]) ?? '5432');
const database = firstDefined(process.env.DB_NAME, process.env.PGDATABASE, dbnameMatch?.[1]) ?? 'postgres';
const user = firstDefined(process.env.DB_USER, process.env.PGUSER, userMatch?.[1]) ?? 'postgres';
const password = firstDefined(process.env.DB_PASSWORD, process.env.PGPASSWORD, passwordMatch?.[1]) ?? '';
const sslCertPath = firstDefined(process.env.DB_SSL_CERT, process.env.PGSSLROOTCERT, sslcertMatch?.[1]) ?? '';
const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true' || !!sslCertPath;

let sslConfig: object | false = false;
if (sslEnabled && sslCertPath && fs.existsSync(sslCertPath)) {
  sslConfig = { ca: fs.readFileSync(sslCertPath).toString() };
} else if (sslEnabled) {
  sslConfig = { rejectUnauthorized: false };
}

export const pool = new Pool({
  host,
  port: Number.isFinite(port) ? port : 5432,
  database,
  user,
  password,
  ssl: sslConfig,
});
