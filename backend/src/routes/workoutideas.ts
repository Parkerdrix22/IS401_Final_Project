import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /workoutideas  — optional ?agegroup= ?intensity=
router.get('/', async (req, res) => {
  const { agegroup, intensity } = req.query;
  try {
    let query = 'SELECT * FROM workoutideas WHERE 1=1';
    const params: unknown[] = [];
    if (agegroup) {
      params.push(agegroup);
      query += ` AND agegroup = $${params.length}`;
    }
    if (intensity) {
      params.push(intensity);
      query += ` AND intensity = $${params.length}`;
    }
    query += ' ORDER BY workoutid';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /workoutideas/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workoutideas WHERE workoutid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Workout idea not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /workoutideas
router.post('/', async (req, res) => {
  const { title, description, instructions, agegroup, durationminutes, intensity, equipment, location, tags } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO workoutideas (title, description, instructions, agegroup, durationminutes, intensity, equipment, location, tags, createdbyuserid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description ?? null, instructions ?? null, agegroup, durationminutes, intensity,
       equipment ?? null, location ?? null, tags ?? null, req.session.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /workoutideas/:id
router.put('/:id', async (req, res) => {
  const { title, description, instructions, agegroup, durationminutes, intensity, equipment, location, tags } = req.body;
  try {
    const result = await pool.query(
      `UPDATE workoutideas SET title = $1, description = $2, instructions = $3, agegroup = $4,
       durationminutes = $5, intensity = $6, equipment = $7, location = $8, tags = $9
       WHERE workoutid = $10 RETURNING *`,
      [title, description ?? null, instructions ?? null, agegroup, durationminutes, intensity,
       equipment ?? null, location ?? null, tags ?? null, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Workout idea not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /workoutideas/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM workoutideas WHERE workoutid = $1 RETURNING workoutid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Workout idea not found' });
      return;
    }
    res.json({ message: 'Workout idea deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
