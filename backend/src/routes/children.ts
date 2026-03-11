import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /children  — filter by ?userid= or defaults to session user
router.get('/', async (req, res) => {
  const userId = req.query.userid ?? req.session.userId;
  try {
    const result = await pool.query(
      'SELECT * FROM children WHERE userid = $1 ORDER BY childid',
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /children/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM children WHERE childid = $1',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /children
router.post('/', async (req, res) => {
  const { userid, firstname, lastname, birthdate, age, height, weight } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO children (userid, firstname, lastname, birthdate, age, height, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userid ?? req.session.userId, firstname, lastname, birthdate, age, height ?? null, weight ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /children/:id
router.put('/:id', async (req, res) => {
  const { firstname, lastname, birthdate, age, height, weight } = req.body;
  try {
    const result = await pool.query(
      `UPDATE children SET firstname = $1, lastname = $2, birthdate = $3, age = $4, height = $5, weight = $6
       WHERE childid = $7 RETURNING *`,
      [firstname, lastname, birthdate, age, height ?? null, weight ?? null, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /children/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM children WHERE childid = $1 RETURNING childid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }
    res.json({ message: 'Child deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
