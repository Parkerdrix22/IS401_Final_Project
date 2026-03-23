import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function ownsChild(userId: number, childId: number): Promise<boolean> {
  const r = await pool.query(
    'SELECT 1 FROM children WHERE childid = $1 AND userid = $2',
    [childId, userId]
  );
  return (r.rowCount ?? 0) > 0;
}

async function activityChildId(activityId: string): Promise<number | null> {
  const r = await pool.query('SELECT childid FROM activitylogs WHERE activityid = $1', [activityId]);
  return r.rows[0]?.childid ?? null;
}

// GET /activitylogs  — requires ?childid=
router.get('/', async (req, res) => {
  const { childid } = req.query;
  if (!childid) {
    res.status(400).json({ error: 'childid query param required' });
    return;
  }

  const cid = Number(childid);
  if (!Number.isFinite(cid)) {
    res.status(400).json({ error: 'Invalid childid' });
    return;
  }

  try {
    if (!req.session.userId || !(await ownsChild(req.session.userId, cid))) {
      res.status(403).json({ error: 'Child not found or access denied' });
      return;
    }
    const result = await pool.query(
      'SELECT * FROM activitylogs WHERE childid = $1 ORDER BY timecreated DESC',
      [cid]
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
    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ error: 'Activity log not found' });
      return;
    }
    if (!req.session.userId || !(await ownsChild(req.session.userId, row.childid))) {
      res.status(403).json({ error: 'Activity log not found or access denied' });
      return;
    }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /activitylogs
router.post('/', async (req, res) => {
  const { childid, activitytype, duration, steps, caloriesburned, repeatingflag, timecreated } = req.body;
  const cid = Number(childid);
  if (!Number.isFinite(cid)) {
    res.status(400).json({ error: 'childid is required' });
    return;
  }

  const typeTrim = typeof activitytype === 'string' ? activitytype.trim() : '';
  if (!typeTrim) {
    res.status(400).json({ error: 'activitytype is required' });
    return;
  }

  const dur = Number(duration);
  if (!Number.isFinite(dur) || dur < 1 || !Number.isInteger(dur)) {
    res.status(400).json({ error: 'duration must be a positive whole number (minutes)' });
    return;
  }

  try {
    if (!req.session.userId || !(await ownsChild(req.session.userId, cid))) {
      res.status(403).json({ error: 'Child not found or access denied' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO activitylogs (childid, activitytype, timecreated, duration, steps, caloriesburned, repeatingflag)
       VALUES ($1, $2, COALESCE($3, NOW()), $4, $5, $6, $7) RETURNING *`,
      [cid, typeTrim.slice(0, 50), timecreated ?? null, dur, steps ?? null, caloriesburned ?? null, repeatingflag ?? false]
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
    const childId = await activityChildId(req.params.id);
    if (childId == null) {
      res.status(404).json({ error: 'Activity log not found' });
      return;
    }
    if (!req.session.userId || !(await ownsChild(req.session.userId, childId))) {
      res.status(403).json({ error: 'Activity log not found or access denied' });
      return;
    }

    const typeTrim = typeof activitytype === 'string' ? activitytype.trim() : '';
    if (!typeTrim) {
      res.status(400).json({ error: 'activitytype is required' });
      return;
    }

    const dur = Number(duration);
    if (!Number.isFinite(dur) || dur < 1 || !Number.isInteger(dur)) {
      res.status(400).json({ error: 'duration must be a positive whole number (minutes)' });
      return;
    }

    const result = await pool.query(
      `UPDATE activitylogs SET activitytype = $1, duration = $2, steps = $3, caloriesburned = $4, repeatingflag = $5
       WHERE activityid = $6 RETURNING *`,
      [typeTrim.slice(0, 50), dur, steps ?? null, caloriesburned ?? null, repeatingflag ?? false, req.params.id]
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
    const childId = await activityChildId(req.params.id);
    if (childId == null) {
      res.status(404).json({ error: 'Activity log not found' });
      return;
    }
    if (!req.session.userId || !(await ownsChild(req.session.userId, childId))) {
      res.status(403).json({ error: 'Activity log not found or access denied' });
      return;
    }
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
