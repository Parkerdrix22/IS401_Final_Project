import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /activitylogs  — requires ?childid=
router.get('/', async (req, res) => {
  const { childid } = req.query;
  if (!childid) {
    res.status(400).json({ error: 'childid query param required' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT * FROM activitylogs WHERE childid = $1 ORDER BY timecreated DESC',
      [childid]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /activitylogs/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activitylogs WHERE activityid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Activity log not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /activitylogs
router.post('/', async (req, res) => {
  const { childid, activitytype, duration, steps, caloriesburned, repeatingflag, timecreated, starttime, endtime, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO activitylogs (childid, activitytype, timecreated, duration, steps, caloriesburned, repeatingflag, starttime, endtime, notes)
       VALUES ($1, $2, COALESCE($3, NOW()), $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [childid, activitytype, timecreated ?? null, duration, steps ?? null, caloriesburned ?? null, repeatingflag ?? false, starttime ?? null, endtime ?? null, notes ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /activitylogs/:id
router.put('/:id', async (req, res) => {
  const { activitytype, duration, steps, caloriesburned, repeatingflag } = req.body;
  try {
    const result = await pool.query(
      `UPDATE activitylogs SET activitytype = $1, duration = $2, steps = $3, caloriesburned = $4, repeatingflag = $5
       WHERE activityid = $6 RETURNING *`,
      [activitytype, duration, steps ?? null, caloriesburned ?? null, repeatingflag ?? false, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Activity log not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /activitylogs/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM activitylogs WHERE activityid = $1 RETURNING activityid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Activity log not found' });
      return;
    }
    res.json({ message: 'Activity log deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
