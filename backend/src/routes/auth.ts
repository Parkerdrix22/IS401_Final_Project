import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

async function ensureUserLoginStreaksTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS userloginstreaks (
      userid INT PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
      currentstreak INT NOT NULL DEFAULT 0,
      longeststreak INT NOT NULL DEFAULT 0,
      lastlogindate DATE,
      lastupdated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function updateUserLoginStreak(userId: number): Promise<void> {
  await ensureUserLoginStreaksTable();
  const result = await pool.query(
    'SELECT currentstreak, longeststreak, lastlogindate FROM userloginstreaks WHERE userid = $1',
    [userId]
  );

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!result.rows[0]) {
    await pool.query(
      `INSERT INTO userloginstreaks (userid, currentstreak, longeststreak, lastlogindate, lastupdated)
       VALUES ($1, 1, 1, CURRENT_DATE, NOW())`,
      [userId]
    );
    return;
  }

  const row = result.rows[0];
  const current = Number(row.currentstreak ?? 0);
  const longest = Number(row.longeststreak ?? 0);
  const lastDate = row.lastlogindate ? new Date(row.lastlogindate) : null;

  if (lastDate) {
    const normalizedLastDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffDays = Math.floor((todayDate.getTime() - normalizedLastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      await pool.query('UPDATE userloginstreaks SET lastupdated = NOW() WHERE userid = $1', [userId]);
      return;
    }

    const nextCurrent = diffDays === 1 ? current + 1 : 1;
    const nextLongest = Math.max(longest, nextCurrent);
    await pool.query(
      `UPDATE userloginstreaks
       SET currentstreak = $1, longeststreak = $2, lastlogindate = CURRENT_DATE, lastupdated = NOW()
       WHERE userid = $3`,
      [nextCurrent, nextLongest, userId]
    );
    return;
  }

  await pool.query(
    `UPDATE userloginstreaks
     SET currentstreak = 1, longeststreak = GREATEST(longeststreak, 1), lastlogindate = CURRENT_DATE, lastupdated = NOW()
     WHERE userid = $1`,
    [userId]
  );
}

// NOTE: The users.passwordhash column is VARCHAR(50) in the schema.
// bcrypt hashes are 60 characters and will be truncated, which breaks compare().
// The schema column should be VARCHAR(60) or larger for bcrypt to work correctly.

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, password, firstname, lastname, email, userrole, children } = req.body;
  if (!username || !password || !firstname || !lastname || !email) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const role: string = userrole || 'parent';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (username, passwordhash, firstname, lastname, email, userrole)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING userid, username, firstname, lastname, email, userrole`,
      [username, hash, firstname, lastname, email, role]
    );
    const user = userResult.rows[0];

    const createdChildren: any[] = [];
    if (role === 'parent' && Array.isArray(children) && children.length > 0) {
      for (const child of children) {
        const cf = String(child.firstname || '').trim();
        const cl = String(child.lastname || '').trim();
        const bd = child.birthdate;
        if (!cf || !cl || !bd) continue;

        // Calculate age from birthdate server-side
        const today = new Date();
        const birth = new Date(bd);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

        const childResult = await client.query(
          `INSERT INTO children (userid, firstname, lastname, birthdate, age, height, weight)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [user.userid, cf, cl, bd, Math.max(0, age), child.height || null, child.weight || null]
        );
        createdChildren.push(childResult.rows[0]);
      }
    }

    await client.query('COMMIT');
    req.session.userId = user.userid;
    res.status(201).json({ ...user, children: createdChildren });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error', detail: err.message });
    }
  } finally {
    client.release();
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Missing username or password' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const match = await bcrypt.compare(password, user.passwordhash);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    await pool.query('UPDATE users SET lastlogin = NOW() WHERE userid = $1', [user.userid]);
    await updateUserLoginStreak(Number(user.userid));
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
