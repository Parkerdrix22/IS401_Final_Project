import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// The .env contains a shell command string, not a plain connection URL.
// Parse each parameter directly from the raw file content.
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const hostMatch = envContent.match(/RDSHOST="([^"]+)"/);
const host = hostMatch ? hostMatch[1] : '';

const portMatch    = envContent.match(/port=(\d+)/);
const dbnameMatch  = envContent.match(/dbname=(\w+)/);
const userMatch    = envContent.match(/\buser=(\w+)/);
const passwordMatch = envContent.match(/password=([^\s"]+)/);
const sslcertMatch  = envContent.match(/sslrootcert=([^\s"]+)/);

const sslCertPath = sslcertMatch ? sslcertMatch[1] : '';
let sslConfig: object = { rejectUnauthorized: false };
if (sslCertPath && fs.existsSync(sslCertPath)) {
  sslConfig = { ca: fs.readFileSync(sslCertPath).toString() };
}

export const pool = new Pool({
  host,
  port:     portMatch    ? parseInt(portMatch[1])    : 5432,
  database: dbnameMatch  ? dbnameMatch[1]            : 'postgres',
  user:     userMatch    ? userMatch[1]              : 'postgres',
  password: passwordMatch ? passwordMatch[1]         : '',
  ssl: sslConfig,
});
