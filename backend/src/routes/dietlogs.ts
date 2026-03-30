import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function ensureDietLogsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dietlogs (
      dietlogid SERIAL PRIMARY KEY,
      childid INT NOT NULL REFERENCES children(childid) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updatedat TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (childid, log_date)
    )
  `);
}

function isDateKey(value: unknown): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

async function childBelongsToUser(childId: number, userId: number): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM children WHERE childid = $1 AND userid = $2',
    [childId, userId]
  );
  return Boolean(result.rows[0]);
}

// GET /dietlogs/day?childid=123&date=2026-03-30
router.get('/day', async (req, res) => {
  const childId = Number(req.query.childid);
  const dateKey = String(req.query.date || '').trim();
  const userId = Number(req.session.userId);

  if (!childId || !isDateKey(dateKey)) {
    res.status(400).json({ error: 'childid and date (YYYY-MM-DD) are required' });
    return;
  }

  try {
    await ensureDietLogsTable();
    if (!(await childBelongsToUser(childId, userId))) {
      res.status(403).json({ error: 'Child not found for this account' });
      return;
    }

    const result = await pool.query(
      'SELECT data FROM dietlogs WHERE childid = $1 AND log_date = $2',
      [childId, dateKey]
    );

    res.json({ data: result.rows[0]?.data ?? null });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /dietlogs/day
// body: { childid, date: "YYYY-MM-DD", data: { ...dayLog } }
router.put('/day', async (req, res) => {
  const childId = Number(req.body?.childid);
  const dateKey = String(req.body?.date || '').trim();
  const data = req.body?.data;
  const userId = Number(req.session.userId);

  if (!childId || !isDateKey(dateKey) || !data || typeof data !== 'object') {
    res.status(400).json({ error: 'childid, date (YYYY-MM-DD), and data object are required' });
    return;
  }

  try {
    await ensureDietLogsTable();
    if (!(await childBelongsToUser(childId, userId))) {
      res.status(403).json({ error: 'Child not found for this account' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO dietlogs (childid, log_date, data, updatedat)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (childid, log_date)
       DO UPDATE SET data = EXCLUDED.data, updatedat = NOW()
       RETURNING dietlogid, childid, log_date, updatedat`,
      [childId, dateKey, JSON.stringify(data)]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
