import express from 'express';
import session from 'express-session';
import cors from 'cors';

import authRoutes          from './routes/auth';
import usersRoutes         from './routes/users';
import childrenRoutes      from './routes/children';
import goalsRoutes         from './routes/goals';
import activitylogsRoutes  from './routes/activitylogs';
import nutritionlogRoutes  from './routes/nutritionlog';
import screentimelogRoutes from './routes/screentimelog';
import workoutideasRoutes  from './routes/workoutideas';
import recipesRoutes       from './routes/recipes';
import tipsRoutes          from './routes/tips';
import streaksRoutes       from './routes/streaks';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'healthy-habits-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

app.use('/auth',          authRoutes);
app.use('/users',         usersRoutes);
app.use('/children',      childrenRoutes);
app.use('/goals',         goalsRoutes);
app.use('/activitylogs',  activitylogsRoutes);
app.use('/nutritionlog',  nutritionlogRoutes);
app.use('/screentimelog', screentimelogRoutes);
app.use('/workoutideas',  workoutideasRoutes);
app.use('/recipes',       recipesRoutes);
app.use('/tips',          tipsRoutes);
app.use('/streaks',       streaksRoutes);

export default app;
