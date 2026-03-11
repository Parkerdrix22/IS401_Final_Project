import { Router } from 'express';
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
  const { firstname, lastname, email, userrole } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET firstname = $1, lastname = $2, email = $3, userrole = $4
       WHERE userid = $5
       RETURNING userid, username, firstname, lastname, email, userrole`,
      [firstname, lastname, email, userrole, req.params.id]
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
