import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

type ScreenTimeRow = {
  screentimelogid: number;
  childid: number;
  date: string;
  duration: number;
  devicetype: string;
  activitytype: string;
  timestamp: string;
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeDurationToMinutes(duration: unknown, durationUnit: unknown): number | null {
  const value = toNumber(duration);
  if (value === null || value <= 0) return null;
  return durationUnit === 'hours' ? Math.round(value * 60) : Math.round(value);
}

function mapRowForFrontend(row: ScreenTimeRow) {
  return {
    ...row,
    id: row.screentimelogid,
    screenid: row.screentimelogid,
    timecreated: row.date ?? row.timestamp,
    durationunit: 'minutes',
    notes: null,
  };
}

// GET /screentimelog  — requires ?childid=
router.get('/', async (req, res) => {
  const childId = toNumber(req.query.childid);
  if (childId === null) {
    res.status(400).json({ error: 'childid query param required' });
    return;
  }

  const { startdate, enddate, category } = req.query;

  const where: string[] = ['childid = $1'];
  const params: Array<string | number> = [childId];

  if (typeof startdate === 'string' && startdate.trim() !== '') {
    params.push(startdate);
    where.push(`COALESCE(date, timestamp) >= $${params.length}::date`);
  }
  if (typeof enddate === 'string' && enddate.trim() !== '') {
    params.push(enddate);
    where.push(`COALESCE(date, timestamp) < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (typeof category === 'string' && category.trim() !== '') {
    params.push(category);
    where.push(`activitytype = $${params.length}`);
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM screentimelog
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(date, timestamp) DESC`,
      params
    );
    res.json(result.rows.map((row) => mapRowForFrontend(row as ScreenTimeRow)));
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
    res.json(mapRowForFrontend(result.rows[0] as ScreenTimeRow));
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /screentimelog
router.post('/', async (req, res) => {
  const {
    childid,
    date,
    timecreated,
    duration,
    durationunit,
    devicetype,
    activitytype,
  } = req.body;

  const childId = toNumber(childid);
  const durationMinutes = normalizeDurationToMinutes(duration, durationunit);

  if (childId === null || !activitytype || durationMinutes === null) {
    res.status(400).json({ error: 'childid, activitytype, and valid duration are required' });
    return;
  }

  const entryDate = typeof date === 'string' && date.trim() !== ''
    ? date
    : typeof timecreated === 'string' && timecreated.trim() !== ''
      ? timecreated
      : null;

  try {
    const result = await pool.query(
      `INSERT INTO screentimelog (childid, date, duration, devicetype, activitytype)
       VALUES ($1, COALESCE($2::timestamp, NOW()), $3, $4, $5)
       RETURNING *`,
      [childId, entryDate, durationMinutes, devicetype ?? 'Unknown', activitytype]
    );
    res.status(201).json(mapRowForFrontend(result.rows[0] as ScreenTimeRow));
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /screentimelog/:id
router.put('/:id', async (req, res) => {
  const { date, timecreated, duration, durationunit, devicetype, activitytype } = req.body;

  const incomingDuration = duration === undefined
    ? null
    : normalizeDurationToMinutes(duration, durationunit);

  if (duration !== undefined && incomingDuration === null) {
    res.status(400).json({ error: 'duration must be a positive number' });
    return;
  }

  const nextDate = typeof date === 'string' && date.trim() !== ''
    ? date
    : typeof timecreated === 'string' && timecreated.trim() !== ''
      ? timecreated
      : null;

  try {
    const result = await pool.query(
      `UPDATE screentimelog
       SET date = COALESCE($1::timestamp, date),
           duration = COALESCE($2, duration),
           devicetype = COALESCE($3, devicetype),
           activitytype = COALESCE($4, activitytype)
       WHERE screentimelogid = $5 RETURNING *`,
      [nextDate, incomingDuration, devicetype ?? null, activitytype ?? null, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Screen time log not found' });
      return;
    }
    res.json(mapRowForFrontend(result.rows[0] as ScreenTimeRow));
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
