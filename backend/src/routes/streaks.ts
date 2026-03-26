import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

type StreakStats = {
  current: number;
  longest: number;
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDateKey(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T00:00:00`);
  base.setDate(base.getDate() + days);
  return toDateKey(base);
}

function dayValueToKey(dayValue: unknown): string {
  if (typeof dayValue === 'string') return dayValue.slice(0, 10);
  if (dayValue instanceof Date) return toDateKey(dayValue);
  return '';
}

function calculateStreakStats(dateKeys: string[]): StreakStats {
  if (dateKeys.length === 0) return { current: 0, longest: 0 };

  const uniqueSorted = [...new Set(dateKeys)].sort();
  const dateSet = new Set(uniqueSorted);
  const todayKey = toDateKey(new Date());
  const yesterdayKey = shiftDateKey(todayKey, -1);

  let current = 0;
  const startKey = dateSet.has(todayKey) ? todayKey : dateSet.has(yesterdayKey) ? yesterdayKey : null;
  if (startKey) {
    let cursor = startKey;
    while (dateSet.has(cursor)) {
      current++;
      cursor = shiftDateKey(cursor, -1);
    }
  }

  let longest = 0;
  for (const key of uniqueSorted) {
    const prev = shiftDateKey(key, -1);
    if (!dateSet.has(prev)) {
      let run = 1;
      let cursor = key;
      while (dateSet.has(shiftDateKey(cursor, 1))) {
        cursor = shiftDateKey(cursor, 1);
        run++;
      }
      longest = Math.max(longest, run);
    }
  }

  return { current, longest };
}

async function upsertChildStreak(
  childId: number,
  category: string,
  stats: StreakStats
): Promise<void> {
  const updated = await pool.query(
    `UPDATE streaks
     SET currentstreak = $1, longeststreak = GREATEST(longeststreak, $2), lastupdated = NOW()
     WHERE childid = $3 AND category = $4`,
    [stats.current, stats.longest, childId, category]
  );
  if (updated.rowCount === 0) {
    await pool.query(
      `INSERT INTO streaks (childid, category, currentstreak, longeststreak, lastupdated)
       VALUES ($1, $2, $3, $4, NOW())`,
      [childId, category, stats.current, stats.longest]
    );
  }
}

async function ensureUserLoginStreaksTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS userloginstreaks (
      userid INT PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
      currentstreak INT NOT NULL DEFAULT 0,
      longeststreak INT NOT NULL DEFAULT 0,
      lastlogindate DATE,
      lastupdated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// GET /streaks/summary
router.get('/summary', async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    await ensureUserLoginStreaksTable();

    const userResult = await pool.query(
      'SELECT userid, username, firstname, lastname, email, userrole FROM users WHERE userid = $1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const childrenResult = await pool.query(
      'SELECT childid, firstname, lastname, age FROM children WHERE userid = $1 ORDER BY childid',
      [userId]
    );
    const children = childrenResult.rows;

    const childSummaries = [];
    for (const child of children) {
      const childId = Number(child.childid);
      const nutritionDatesResult = await pool.query(
        'SELECT DISTINCT DATE(timestamp) AS day FROM nutritionlog WHERE childid = $1',
        [childId]
      );
      const fitnessDatesResult = await pool.query(
        'SELECT DISTINCT DATE(timecreated) AS day FROM activitylogs WHERE childid = $1',
        [childId]
      );

      const nutritionDates = nutritionDatesResult.rows.map((row) => dayValueToKey(row.day)).filter(Boolean);
      const fitnessDates = fitnessDatesResult.rows.map((row) => dayValueToKey(row.day)).filter(Boolean);
      const nutritionSet = new Set(nutritionDates);
      const fitnessSet = new Set(fitnessDates);
      const combinedDates = nutritionDates.filter((day) => fitnessSet.has(day));

      const nutritionStats = calculateStreakStats(nutritionDates);
      const fitnessStats = calculateStreakStats(fitnessDates);
      const combinedStats = calculateStreakStats(combinedDates);

      await upsertChildStreak(childId, 'Nutrition', nutritionStats);
      await upsertChildStreak(childId, 'Fitness', fitnessStats);
      await upsertChildStreak(childId, 'Healthy Habits', combinedStats);

      childSummaries.push({
        childid: childId,
        firstname: child.firstname,
        lastname: child.lastname,
        age: child.age,
        streaks: {
          nutrition: nutritionStats,
          fitness: fitnessStats,
          healthyHabits: combinedStats,
        },
      });
    }

    const loginStreakResult = await pool.query(
      'SELECT currentstreak, longeststreak FROM userloginstreaks WHERE userid = $1',
      [userId]
    );
    const loginStreak = loginStreakResult.rows[0]
      ? {
          current: Number(loginStreakResult.rows[0].currentstreak ?? 0),
          longest: Number(loginStreakResult.rows[0].longeststreak ?? 0),
        }
      : { current: 0, longest: 0 };

    res.json({
      user,
      loginStreak,
      children: childSummaries,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

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
