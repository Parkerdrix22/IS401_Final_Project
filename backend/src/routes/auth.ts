import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

// NOTE: The users.passwordhash column is VARCHAR(50) in the schema.
// bcrypt hashes are 60 characters and will be truncated, which breaks compare().
// The schema column should be VARCHAR(60) or larger for bcrypt to work correctly.

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, password, firstname, lastname, email, userrole } = req.body;
  if (!username || !password || !firstname || !lastname || !email) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, passwordhash, firstname, lastname, email, userrole)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING userid, username, firstname, lastname, email, userrole`,
      [username, hash, firstname, lastname, email, userrole || 'parent']
    );
    const user = result.rows[0];
    req.session.userId = user.userid;
    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error', detail: err.message });
    }
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { identifier, username, email, password } = req.body;
  const loginId = (identifier ?? username ?? email ?? '').trim();

  if (!loginId || !password) {
    res.status(400).json({ error: 'Missing username/email or password' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [loginId]
    );
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    // Some legacy/seeded rows may not contain a valid bcrypt hash.
    // Treat them as invalid credentials instead of returning a 500 error.
    if (!BCRYPT_HASH_RE.test(user.passwordhash ?? '')) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordhash);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    await pool.query('UPDATE users SET lastlogin = NOW() WHERE userid = $1', [user.userid]);
    req.session.userId = user.userid;
    res.json({
      userid: user.userid,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      userrole: user.userrole,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Could not log out' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT userid, username, firstname, lastname, email, userrole FROM users WHERE userid = $1',
      [req.session.userId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
