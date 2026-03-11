import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /streaks  — requires ?childid=
router.get('/', async (req, res) => {
  const { childid } = req.query;
  if (!childid) {
    res.status(400).json({ error: 'childid query param required' });
    return;
  }
  try {
    const result = await pool.query(
      'SELECT * FROM streaks WHERE childid = $1 ORDER BY streakid',
      [childid]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /streaks/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM streaks WHERE streakid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Streak not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /streaks
router.post('/', async (req, res) => {
  const { childid, category, currentstreak, longeststreak } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO streaks (childid, category, currentstreak, longeststreak)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [childid, category, currentstreak ?? 0, longeststreak ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /streaks/:id
router.put('/:id', async (req, res) => {
  const { category, currentstreak, longeststreak } = req.body;
  try {
    const result = await pool.query(
      `UPDATE streaks SET category = $1, currentstreak = $2, longeststreak = $3, lastupdated = NOW()
       WHERE streakid = $4 RETURNING *`,
      [category, currentstreak, longeststreak, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Streak not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /streaks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM streaks WHERE streakid = $1 RETURNING streakid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Streak not found' });
      return;
    }
    res.json({ message: 'Streak deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
