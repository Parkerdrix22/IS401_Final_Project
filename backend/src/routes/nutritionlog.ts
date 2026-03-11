import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /nutritionlog  — requires ?childid=
router.get('/', async (req, res) => {
  const { childid } = req.query;
  if (!childid) {
    res.status(400).json({ error: 'childid query param required' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT * FROM nutritionlog WHERE childid = $1 ORDER BY timestamp DESC',
      [childid]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /nutritionlog/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM nutritionlog WHERE nutritionlogid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Nutrition log not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /nutritionlog
router.post('/', async (req, res) => {
  const { childid, fooditem, foodgroup, servingsize, ishealthy } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO nutritionlog (childid, fooditem, foodgroup, servingsize, ishealthy)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [childid, fooditem, foodgroup, servingsize, ishealthy ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /nutritionlog/:id
router.put('/:id', async (req, res) => {
  const { fooditem, foodgroup, servingsize, ishealthy } = req.body;
  try {
    const result = await pool.query(
      `UPDATE nutritionlog SET fooditem = $1, foodgroup = $2, servingsize = $3, ishealthy = $4
       WHERE nutritionlogid = $5 RETURNING *`,
      [fooditem, foodgroup, servingsize, ishealthy ?? true, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Nutrition log not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /nutritionlog/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM nutritionlog WHERE nutritionlogid = $1 RETURNING nutritionlogid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Nutrition log not found' });
      return;
    }
    res.json({ message: 'Nutrition log deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
