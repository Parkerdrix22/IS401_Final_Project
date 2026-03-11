import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /recipes  — optional ?difficulty= ?tags=
router.get('/', async (req, res) => {
  const { difficulty, tags } = req.query;
  try {
    let query = 'SELECT * FROM recipes WHERE 1=1';
    const params: unknown[] = [];
    if (difficulty) {
      params.push(difficulty);
      query += ` AND difficulty = $${params.length}`;
    }
    if (tags) {
      params.push(`%${tags}%`);
      query += ` AND tags ILIKE $${params.length}`;
    }
    query += ' ORDER BY recipeid';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes WHERE recipeid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /recipes
router.post('/', async (req, res) => {
  const { title, difficulty, description, instructions, nutritioninfo, prepminutes, cookminutes, servings, tags, imageurl } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO recipes (title, difficulty, description, instructions, nutritioninfo, prepminutes, cookminutes, servings, tags, imageurl, createdbyuserid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [title, difficulty, description ?? null, instructions ?? null, nutritioninfo ?? null,
       prepminutes, cookminutes, servings, tags ?? null, imageurl ?? null, req.session.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /recipes/:id
router.put('/:id', async (req, res) => {
  const { title, difficulty, description, instructions, nutritioninfo, prepminutes, cookminutes, servings, tags, imageurl } = req.body;
  try {
    const result = await pool.query(
      `UPDATE recipes SET title = $1, difficulty = $2, description = $3, instructions = $4,
       nutritioninfo = $5, prepminutes = $6, cookminutes = $7, servings = $8, tags = $9, imageurl = $10
       WHERE recipeid = $11 RETURNING *`,
      [title, difficulty, description ?? null, instructions ?? null, nutritioninfo ?? null,
       prepminutes, cookminutes, servings, tags ?? null, imageurl ?? null, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /recipes/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM recipes WHERE recipeid = $1 RETURNING recipeid',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.json({ message: 'Recipe deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
