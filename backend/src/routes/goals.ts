import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

type GoalRow = {
  goalid: number;
  userid: number;
  childid: number;
  category: string;
  targetvalue: number;
  goaltype: string;
  value: number;
  unit: string;
  start_date: string;
  end_date: string;
  frequency: string;
  isactive: boolean;
};

type WeeklyStats = {
  nutrition_entries: number;
  healthy_nutrition_entries: number;
  nutrition_servings: number;
  fitness_minutes: number;
  screentime_minutes: number;
};

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGoalType(goalType: string): string {
  return String(goalType || '').trim().toLowerCase();
}

function computeProgress(goalType: string, value: number, target: number): number {
  if (target <= 0) return 0;
  const normalized = normalizeGoalType(goalType);
  if (normalized === 'at_most' || normalized === 'under') {
    return Math.max(0, Math.min(100, ((target - value) / target) * 100));
  }
  return Math.max(0, Math.min(100, (value / target) * 100));
}

function computeStatus(goalType: string, value: number, target: number): string {
  if (target <= 0) return 'No target';
  const normalized = normalizeGoalType(goalType);
  if (normalized === 'at_most' || normalized === 'under') {
    if (value <= target * 0.85) return 'On track';
    if (value <= target) return 'At risk';
    return 'Over target';
  }
  if (value >= target) return 'Completed';
  if (value >= target * 0.75) return 'On track';
  return 'In progress';
}

function getTrackConfig(category: string, goalType: string): { metricKey: keyof WeeklyStats | null; comingSoon: boolean } {
  const normalizedType = normalizeGoalType(goalType);
  if (normalizedType === 'manual' || normalizedType === 'self_reported') {
    return { metricKey: null, comingSoon: false };
  }

  const normalizedCategory = String(category || '').trim().toLowerCase();
  if (normalizedCategory === 'nutrition') return { metricKey: 'nutrition_entries', comingSoon: false };
  if (normalizedCategory === 'fitness') return { metricKey: 'fitness_minutes', comingSoon: false };
  if (normalizedCategory === 'screen time' || normalizedCategory === 'screentime') {
    return { metricKey: 'screentime_minutes', comingSoon: true };
  }
  return { metricKey: null, comingSoon: false };
}

async function loadWeeklyStatsForUser(userId: number): Promise<Map<number, WeeklyStats>> {
  const result = await pool.query(
    `SELECT
       c.childid,
       COALESCE(n.nutrition_entries, 0) AS nutrition_entries,
       COALESCE(n.healthy_nutrition_entries, 0) AS healthy_nutrition_entries,
       COALESCE(n.nutrition_servings, 0) AS nutrition_servings,
       COALESCE(a.fitness_minutes, 0) AS fitness_minutes,
       COALESCE(s.screentime_minutes, 0) AS screentime_minutes
     FROM children c
     LEFT JOIN (
       SELECT
         nl.childid,
         COUNT(*) AS nutrition_entries,
         SUM(CASE WHEN nl.ishealthy THEN 1 ELSE 0 END) AS healthy_nutrition_entries,
         SUM(COALESCE(nl.servingsize, 0)) AS nutrition_servings
       FROM nutritionlog nl
       WHERE nl.timestamp >= date_trunc('week', NOW())
         AND nl.timestamp < date_trunc('week', NOW()) + INTERVAL '7 days'
       GROUP BY nl.childid
     ) n ON n.childid = c.childid
     LEFT JOIN (
       SELECT
         al.childid,
         SUM(COALESCE(al.duration, 0)) AS fitness_minutes
       FROM activitylogs al
       WHERE al.timecreated >= date_trunc('week', NOW())
         AND al.timecreated < date_trunc('week', NOW()) + INTERVAL '7 days'
       GROUP BY al.childid
     ) a ON a.childid = c.childid
     LEFT JOIN (
       SELECT
         sl.childid,
         SUM(COALESCE(sl.duration, 0)) AS screentime_minutes
       FROM screentimelog sl
       WHERE sl.timestamp >= date_trunc('week', NOW())
         AND sl.timestamp < date_trunc('week', NOW()) + INTERVAL '7 days'
       GROUP BY sl.childid
     ) s ON s.childid = c.childid
     WHERE c.userid = $1
     ORDER BY c.childid`,
    [userId]
  );

  const statsByChild = new Map<number, WeeklyStats>();
  for (const row of result.rows) {
    statsByChild.set(Number(row.childid), {
      nutrition_entries: safeNumber(row.nutrition_entries),
      healthy_nutrition_entries: safeNumber(row.healthy_nutrition_entries),
      nutrition_servings: safeNumber(row.nutrition_servings),
      fitness_minutes: safeNumber(row.fitness_minutes),
      screentime_minutes: safeNumber(row.screentime_minutes),
    });
  }
  return statsByChild;
}

// GET /goals/summary
router.get('/summary', async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    const [childrenResult, goalsResult, weeklyStatsByChild, weekRangeResult] = await Promise.all([
      pool.query(
        'SELECT childid, firstname, lastname, age FROM children WHERE userid = $1 ORDER BY childid',
        [userId]
      ),
      pool.query(
        'SELECT * FROM goals WHERE userid = $1 ORDER BY childid, goalid',
        [userId]
      ),
      loadWeeklyStatsForUser(userId),
      pool.query(`SELECT date_trunc('week', NOW()) AS week_start, date_trunc('week', NOW()) + INTERVAL '6 days' AS week_end`),
    ]);

    const goalsByChild = new Map<number, GoalRow[]>();
    for (const goal of goalsResult.rows as GoalRow[]) {
      const childGoals = goalsByChild.get(Number(goal.childid)) || [];
      childGoals.push(goal);
      goalsByChild.set(Number(goal.childid), childGoals);
    }

    const children = childrenResult.rows.map((child) => {
      const childId = Number(child.childid);
      const weekly = weeklyStatsByChild.get(childId) || {
        nutrition_entries: 0,
        healthy_nutrition_entries: 0,
        nutrition_servings: 0,
        fitness_minutes: 0,
        screentime_minutes: 0,
      };

      const goals = (goalsByChild.get(childId) || []).map((goal) => {
        const track = getTrackConfig(goal.category, goal.goaltype);
        const computedValue = track.metricKey ? weekly[track.metricKey] : safeNumber(goal.value);
        const progress = computeProgress(goal.goaltype, computedValue, safeNumber(goal.targetvalue));
        const status = computeStatus(goal.goaltype, computedValue, safeNumber(goal.targetvalue));
        return {
          ...goal,
          value: computedValue,
          progressPercent: progress,
          status,
          trackedAutomatically: Boolean(track.metricKey) && !track.comingSoon,
          comingSoon: track.comingSoon,
        };
      });

      return {
        childid: childId,
        firstname: child.firstname,
        lastname: child.lastname,
        age: child.age,
        weekly,
        goals,
      };
    });

    res.json({
      weekStart: weekRangeResult.rows[0]?.week_start ?? null,
      weekEnd: weekRangeResult.rows[0]?.week_end ?? null,
      children,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /goals  — filter by ?userid= and/or ?childid=
router.get('/', async (req, res) => {
  const { userid, childid } = req.query;
  try {
    let query = 'SELECT * FROM goals WHERE 1=1';
    const params: unknown[] = [];
    if (userid) {
      params.push(userid);
      query += ` AND userid = $${params.length}`;
    }
    if (childid) {
      params.push(childid);
      query += ` AND childid = $${params.length}`;
    }
    query += ' ORDER BY goalid';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// GET /goals/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals WHERE goalid = $1', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// POST /goals
router.post('/', async (req, res) => {
  const { userid, childid, category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO goals (userid, childid, category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userid ?? req.session.userId, childid, category, targetvalue, goaltype, value ?? 0, unit, start_date, end_date, frequency, isactive ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// PUT /goals/:id
router.put('/:id', async (req, res) => {
  const { category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive } = req.body;
  try {
    const result = await pool.query(
      `UPDATE goals SET category = $1, targetvalue = $2, goaltype = $3, value = $4, unit = $5,
       start_date = $6, end_date = $7, frequency = $8, isactive = $9
       WHERE goalid = $10 RETURNING *`,
      [category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// DELETE /goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM goals WHERE goalid = $1 RETURNING goalid', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json({ message: 'Goal deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

export default router;
