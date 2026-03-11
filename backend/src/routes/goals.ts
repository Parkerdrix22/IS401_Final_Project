import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /goals  — filter by ?userid= and/or ?childid=
router.get('/', async (req, res) => {
  const { userid, childid } = req.query;
  try {
    let query = 'SELECT * FROM goals WHERE 1=1';
    const params: unknown[] = [];
    if (userid) {
      params.push(userid);
      query += ` AND userid = $${params.length}`;
    }
    if (childid) {
      params.push(childid);
      query += ` AND childid = $${params.length}`;
    }
    query += ' ORDER BY goalid';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /goals/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals WHERE goalid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /goals
router.post('/', async (req, res) => {
  const { userid, childid, category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO goals (userid, childid, category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userid ?? req.session.userId, childid, category, targetvalue, goaltype, value ?? 0, unit, start_date, end_date, frequency, isactive ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /goals/:id
router.put('/:id', async (req, res) => {
  const { category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive } = req.body;
  try {
    const result = await pool.query(
      `UPDATE goals SET category = $1, targetvalue = $2, goaltype = $3, value = $4, unit = $5,
       start_date = $6, end_date = $7, frequency = $8, isactive = $9
       WHERE goalid = $10 RETURNING *`,
      [category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM goals WHERE goalid = $1 RETURNING goalid', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json({ message: 'Goal deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
