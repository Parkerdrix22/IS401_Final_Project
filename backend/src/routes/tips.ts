import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /tips  — optional ?category= ?agegroup=
router.get('/', async (req, res) => {
  const { category, agegroup } = req.query;
  try {
    let query = 'SELECT * FROM tips WHERE 1=1';
    const params: unknown[] = [];
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (agegroup) {
      params.push(agegroup);
      query += ` AND agegroup = $${params.length}`;
    }
    query += ' ORDER BY tipid';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /tips/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tips WHERE tipid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Tip not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /tips
router.post('/', async (req, res) => {
  const { category, content, agegroup, isactive } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tips (category, content, agegroup, isactive)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [category, content, agegroup, isactive ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /tips/:id
router.put('/:id', async (req, res) => {
  const { category, content, agegroup, isactive } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tips SET category = $1, content = $2, agegroup = $3, isactive = $4
       WHERE tipid = $5 RETURNING *`,
      [category, content, agegroup, isactive ?? true, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Tip not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /tips/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tips WHERE tipid = $1 RETURNING tipid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Tip not found' });
      return;
    }
    res.json({ message: 'Tip deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
