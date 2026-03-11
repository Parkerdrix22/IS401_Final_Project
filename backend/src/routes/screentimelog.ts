import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /screentimelog  — requires ?childid=
router.get('/', async (req, res) => {
  const { childid } = req.query;
  if (!childid) {
    res.status(400).json({ error: 'childid query param required' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT * FROM screentimelog WHERE childid = $1 ORDER BY timestamp DESC',
      [childid]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /screentimelog/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM screentimelog WHERE screentimelogid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Screen time log not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /screentimelog
router.post('/', async (req, res) => {
  const { childid, date, duration, devicetype, activitytype } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO screentimelog (childid, date, duration, devicetype, activitytype)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [childid, date, duration, devicetype, activitytype]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /screentimelog/:id
router.put('/:id', async (req, res) => {
  const { date, duration, devicetype, activitytype } = req.body;
  try {
    const result = await pool.query(
      `UPDATE screentimelog SET date = $1, duration = $2, devicetype = $3, activitytype = $4
       WHERE screentimelogid = $5 RETURNING *`,
      [date, duration, devicetype, activitytype, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Screen time log not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /screentimelog/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM screentimelog WHERE screentimelogid = $1 RETURNING screentimelogid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Screen time log not found' });
      return;
    }
    res.json({ message: 'Screen time log deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
