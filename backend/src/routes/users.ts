import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /users
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT userid, username, firstname, lastname, email, userrole, datecreated, lastlogin FROM users ORDER BY userid'
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT userid, username, firstname, lastname, email, userrole, datecreated, lastlogin FROM users WHERE userid = $1',
      [req.params.id]
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

// PUT /users/:id
router.put('/:id', async (req, res) => {
  const { username, firstname, lastname, email, userrole, password } = req.body;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const pushField = (name: string, value: any) => {
      if (value === undefined) return;
      fields.push(`${name} = $${idx}`);
      values.push(value);
      idx += 1;
    };

    pushField('username', username);
    pushField('firstname', firstname);
    pushField('lastname', lastname);
    pushField('email', email);
    pushField('userrole', userrole);

    if (password) {
      const passwordhash = await bcrypt.hash(password, 10);
      pushField('passwordhash', passwordhash);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields provided for update' });
      return;
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE userid = $${idx}
       RETURNING userid, username, firstname, lastname, email, userrole`,
      values
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /users/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM users WHERE userid = $1 RETURNING userid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'User deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
