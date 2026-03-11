/**
 * Integration tests — run against the live RDS instance.
 * Each suite cleans up its own test data in afterAll.
 */
import request from 'supertest';
import app from '../app';
import { pool } from '../db';

const TEST_USER = {
  username:  `testuser_${Date.now()}`,
  password:  'TestPass123!',
  firstname: 'Test',
  lastname:  'User',
  email:     `testuser_${Date.now()}@example.com`,
};

// Shared state across tests
let cookie = '';        // session cookie after login
let userId  = 0;
let childId = 0;
let goalId  = 0;
let activityId = 0;
let nutritionId = 0;
let screentimeId = 0;
let workoutId = 0;
let recipeId = 0;
let tipId = 0;
let streakId = 0;

// ─── Auth ─────────────────────────────────────────────────────────────────

describe('Auth', () => {
  test('POST /auth/register → 201 with user object', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(TEST_USER);

    expect(res.status).toBe(201);
    expect(res.body.username).toBe(TEST_USER.username);
    userId = res.body.userid;
    cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toBeTruthy();
  });

  test('POST /auth/register duplicate → 409', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(TEST_USER);
    expect(res.status).toBe(409);
  });

  test('POST /auth/login with wrong password → 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: TEST_USER.username, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('POST /auth/login with correct password → 200', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: TEST_USER.username, password: TEST_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(TEST_USER.username);
    cookie = res.headers['set-cookie']?.[0] ?? '';
  });

  test('GET /auth/me with session → 200', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.userid).toBe(userId);
  });

  test('GET /auth/me without session → 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────

describe('Users', () => {
  test('GET /users → 200 array', async () => {
    const res = await request(app).get('/users').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /users/:id → 200 with correct user', async () => {
    const res = await request(app).get(`/users/${userId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.userid).toBe(userId);
  });

  test('GET /users/:id not found → 404', async () => {
    const res = await request(app).get('/users/999999').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  test('PUT /users/:id → 200 updated', async () => {
    const res = await request(app)
      .put(`/users/${userId}`)
      .set('Cookie', cookie)
      .send({ firstname: 'Updated', lastname: 'User', email: TEST_USER.email, userrole: 'parent' });
    expect(res.status).toBe(200);
    expect(res.body.firstname).toBe('Updated');
  });
});

// ─── Children ─────────────────────────────────────────────────────────────

describe('Children', () => {
  test('POST /children → 201', async () => {
    const res = await request(app)
      .post('/children')
      .set('Cookie', cookie)
      .send({ userid: userId, firstname: 'TestKid', lastname: 'User', birthdate: '2015-01-01', age: 10 });
    expect(res.status).toBe(201);
    childId = res.body.childid;
    expect(childId).toBeTruthy();
  });

  test('GET /children → 200 array filtered by session user', async () => {
    const res = await request(app).get('/children').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: any) => c.childid === childId)).toBe(true);
  });

  test('GET /children/:id → 200', async () => {
    const res = await request(app).get(`/children/${childId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.childid).toBe(childId);
  });

  test('PUT /children/:id → 200 updated', async () => {
    const res = await request(app)
      .put(`/children/${childId}`)
      .set('Cookie', cookie)
      .send({ firstname: 'KidUpdated', lastname: 'User', birthdate: '2015-01-01', age: 11 });
    expect(res.status).toBe(200);
    expect(res.body.firstname).toBe('KidUpdated');
  });
});

// ─── Goals ────────────────────────────────────────────────────────────────

describe('Goals', () => {
  test('POST /goals → 201', async () => {
    const res = await request(app)
      .post('/goals')
      .set('Cookie', cookie)
      .send({
        userid: userId, childid: childId, category: 'Fitness',
        targetvalue: 10000, goaltype: 'Steps', value: 0,
        unit: 'steps', start_date: '2026-01-01', end_date: '2026-12-31',
        frequency: 'Daily', isactive: true,
      });
    expect(res.status).toBe(201);
    goalId = res.body.goalid;
    expect(goalId).toBeTruthy();
  });

  test('GET /goals?userid= → 200 array', async () => {
    const res = await request(app).get(`/goals?userid=${userId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.some((g: any) => g.goalid === goalId)).toBe(true);
  });

  test('GET /goals/:id → 200', async () => {
    const res = await request(app).get(`/goals/${goalId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.goalid).toBe(goalId);
  });

  test('PUT /goals/:id → 200 updated', async () => {
    const res = await request(app)
      .put(`/goals/${goalId}`)
      .set('Cookie', cookie)
      .send({
        category: 'Fitness', targetvalue: 12000, goaltype: 'Steps', value: 500,
        unit: 'steps', start_date: '2026-01-01', end_date: '2026-12-31',
        frequency: 'Daily', isactive: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.targetvalue).toBe(12000);
  });
});

// ─── Activity Logs ────────────────────────────────────────────────────────

describe('Activity Logs', () => {
  test('POST /activitylogs → 201', async () => {
    const res = await request(app)
      .post('/activitylogs')
      .set('Cookie', cookie)
      .send({ childid: childId, activitytype: 'Running', duration: 30 });
    expect(res.status).toBe(201);
    activityId = res.body.activityid;
  });

  test('GET /activitylogs?childid= → 200 array', async () => {
    const res = await request(app).get(`/activitylogs?childid=${childId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.some((a: any) => a.activityid === activityId)).toBe(true);
  });

  test('GET /activitylogs without childid → 400', async () => {
    const res = await request(app).get('/activitylogs').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  test('PUT /activitylogs/:id → 200', async () => {
    const res = await request(app)
      .put(`/activitylogs/${activityId}`)
      .set('Cookie', cookie)
      .send({ activitytype: 'Swimming', duration: 45 });
    expect(res.status).toBe(200);
    expect(res.body.activitytype).toBe('Swimming');
  });
});

// ─── Nutrition Log ────────────────────────────────────────────────────────

describe('Nutrition Log', () => {
  test('POST /nutritionlog → 201', async () => {
    const res = await request(app)
      .post('/nutritionlog')
      .set('Cookie', cookie)
      .send({ childid: childId, fooditem: 'Apple', foodgroup: 'Fruit', servingsize: 1 });
    expect(res.status).toBe(201);
    nutritionId = res.body.nutritionlogid;
  });

  test('GET /nutritionlog?childid= → 200 array', async () => {
    const res = await request(app).get(`/nutritionlog?childid=${childId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.some((n: any) => n.nutritionlogid === nutritionId)).toBe(true);
  });

  test('PUT /nutritionlog/:id → 200', async () => {
    const res = await request(app)
      .put(`/nutritionlog/${nutritionId}`)
      .set('Cookie', cookie)
      .send({ fooditem: 'Banana', foodgroup: 'Fruit', servingsize: 2, ishealthy: true });
    expect(res.status).toBe(200);
    expect(res.body.fooditem).toBe('Banana');
  });
});

// ─── Screen Time Log ──────────────────────────────────────────────────────

describe('Screen Time Log', () => {
  test('POST /screentimelog → 201', async () => {
    const res = await request(app)
      .post('/screentimelog')
      .set('Cookie', cookie)
      .send({ childid: childId, date: '2026-03-01', duration: 60, devicetype: 'Tablet', activitytype: 'Educational' });
    expect(res.status).toBe(201);
    screentimeId = res.body.screentimelogid;
  });

  test('GET /screentimelog?childid= → 200 array', async () => {
    const res = await request(app).get(`/screentimelog?childid=${childId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.some((s: any) => s.screentimelogid === screentimeId)).toBe(true);
  });

  test('PUT /screentimelog/:id → 200', async () => {
    const res = await request(app)
      .put(`/screentimelog/${screentimeId}`)
      .set('Cookie', cookie)
      .send({ date: '2026-03-01', duration: 90, devicetype: 'Phone', activitytype: 'Gaming' });
    expect(res.status).toBe(200);
    expect(res.body.duration).toBe(90);
  });
});

// ─── Workout Ideas ────────────────────────────────────────────────────────

describe('Workout Ideas', () => {
  test('POST /workoutideas → 201', async () => {
    const res = await request(app)
      .post('/workoutideas')
      .set('Cookie', cookie)
      .send({ title: 'Test Workout', agegroup: '6-12', durationminutes: 30, intensity: 'Medium' });
    expect(res.status).toBe(201);
    workoutId = res.body.workoutid;
  });

  test('GET /workoutideas → 200 array', async () => {
    const res = await request(app).get('/workoutideas').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /workoutideas?agegroup=6-12 → filtered array', async () => {
    const res = await request(app).get('/workoutideas?agegroup=6-12').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.every((w: any) => w.agegroup === '6-12')).toBe(true);
  });

  test('GET /workoutideas/:id → 200', async () => {
    const res = await request(app).get(`/workoutideas/${workoutId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.workoutid).toBe(workoutId);
  });

  test('PUT /workoutideas/:id → 200', async () => {
    const res = await request(app)
      .put(`/workoutideas/${workoutId}`)
      .set('Cookie', cookie)
      .send({ title: 'Updated Workout', agegroup: '6-12', durationminutes: 45, intensity: 'High' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Workout');
  });
});

// ─── Recipes ──────────────────────────────────────────────────────────────

describe('Recipes', () => {
  test('POST /recipes → 201', async () => {
    const res = await request(app)
      .post('/recipes')
      .set('Cookie', cookie)
      .send({ title: 'Test Recipe', difficulty: 'Easy', prepminutes: 10, cookminutes: 20, servings: 4 });
    expect(res.status).toBe(201);
    recipeId = res.body.recipeid;
  });

  test('GET /recipes → 200 array', async () => {
    const res = await request(app).get('/recipes').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /recipes?difficulty=Easy → filtered', async () => {
    const res = await request(app).get('/recipes?difficulty=Easy').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.difficulty === 'Easy')).toBe(true);
  });

  test('PUT /recipes/:id → 200', async () => {
    const res = await request(app)
      .put(`/recipes/${recipeId}`)
      .set('Cookie', cookie)
      .send({ title: 'Updated Recipe', difficulty: 'Medium', prepminutes: 15, cookminutes: 25, servings: 2 });
    expect(res.status).toBe(200);
    expect(res.body.difficulty).toBe('Medium');
  });
});

// ─── Tips ─────────────────────────────────────────────────────────────────

describe('Tips', () => {
  test('POST /tips → 201', async () => {
    const res = await request(app)
      .post('/tips')
      .set('Cookie', cookie)
      .send({ category: 'Fitness', content: 'Go outside daily', agegroup: '6-12' });
    expect(res.status).toBe(201);
    tipId = res.body.tipid;
  });

  test('GET /tips → 200 array', async () => {
    const res = await request(app).get('/tips').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /tips?category=Fitness → filtered', async () => {
    const res = await request(app).get('/tips?category=Fitness').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.every((t: any) => t.category === 'Fitness')).toBe(true);
  });

  test('PUT /tips/:id → 200', async () => {
    const res = await request(app)
      .put(`/tips/${tipId}`)
      .set('Cookie', cookie)
      .send({ category: 'Nutrition', content: 'Eat veggies', agegroup: '6-12', isactive: true });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Nutrition');
  });
});

// ─── Streaks ──────────────────────────────────────────────────────────────

describe('Streaks', () => {
  test('POST /streaks → 201', async () => {
    const res = await request(app)
      .post('/streaks')
      .set('Cookie', cookie)
      .send({ childid: childId, category: 'Fitness', currentstreak: 3, longeststreak: 5 });
    expect(res.status).toBe(201);
    streakId = res.body.streakid;
  });

  test('GET /streaks?childid= → 200 array', async () => {
    const res = await request(app).get(`/streaks?childid=${childId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.some((s: any) => s.streakid === streakId)).toBe(true);
  });

  test('PUT /streaks/:id → 200', async () => {
    const res = await request(app)
      .put(`/streaks/${streakId}`)
      .set('Cookie', cookie)
      .send({ category: 'Fitness', currentstreak: 4, longeststreak: 6 });
    expect(res.status).toBe(200);
    expect(res.body.currentstreak).toBe(4);
  });
});

// ─── DELETE cascade ───────────────────────────────────────────────────────

describe('Delete (cleanup)', () => {
  test('DELETE /streaks/:id → 200', async () => {
    const res = await request(app).delete(`/streaks/${streakId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /activitylogs/:id → 200', async () => {
    const res = await request(app).delete(`/activitylogs/${activityId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /nutritionlog/:id → 200', async () => {
    const res = await request(app).delete(`/nutritionlog/${nutritionId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /screentimelog/:id → 200', async () => {
    const res = await request(app).delete(`/screentimelog/${screentimeId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /goals/:id → 200', async () => {
    const res = await request(app).delete(`/goals/${goalId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /children/:id → 200', async () => {
    const res = await request(app).delete(`/children/${childId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /workoutideas/:id → 200', async () => {
    const res = await request(app).delete(`/workoutideas/${workoutId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /recipes/:id → 200', async () => {
    const res = await request(app).delete(`/recipes/${recipeId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /tips/:id → 200', async () => {
    const res = await request(app).delete(`/tips/${tipId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('DELETE /users/:id → 200', async () => {
    const res = await request(app).delete(`/users/${userId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });
});

// ─── Logout & protected route guard ───────────────────────────────────────

describe('Logout', () => {
  test('POST /auth/logout → 200', async () => {
    const res = await request(app).post('/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  test('GET /children after logout → 401', async () => {
    const res = await request(app).get('/children').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

// ─── Close DB pool ────────────────────────────────────────────────────────

afterAll(async () => {
  await pool.end();
});
