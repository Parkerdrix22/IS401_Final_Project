# Healthy Habits

A family health tracking web application that helps parents monitor and encourage healthy behaviors in their children. Track fitness, nutrition, screen time, and goals — all in one place.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Frontend Pages](#frontend-pages)
- [Authentication](#authentication)
- [Scripts](#scripts)
- [Requirements (EARS)](#requirements-ears)

---

## Overview

Healthy Habits is built for families who want to build better routines. Parents create accounts, add child profiles, and track:

- **Fitness** — Log physical activities, steps, calories burned
- **Nutrition** — Track meals and food groups
- **Screen Time** — Monitor device usage by type and activity
- **Goals** — Set and track habit goals with progress tracking
- **Streaks** — Keep kids motivated with streak tracking
- **Workout Ideas** — Browse age-appropriate exercise suggestions
- **Recipes** — Discover healthy meal ideas
- **Tips** — Category-specific health guidance

The app supports three roles: **Parent**, **Coach**, and **Admin**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL (AWS RDS) |
| Auth | bcrypt, express-session |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Testing | Jest |
| Dev Tools | ts-node-dev, dotenv, concurrently |

---

## Project Structure

```
IS401_Final_Project/
├── backend/
│   └── src/
│       ├── index.ts              # Entry point
│       ├── app.ts                # Express app + middleware setup
│       ├── db.ts                 # PostgreSQL pool connection
│       ├── setup.ts              # Schema + seed runner
│       ├── migrate.ts            # Database migrations
│       ├── middleware/
│       │   └── auth.ts           # requireAuth middleware
│       ├── types/
│       │   └── session.d.ts      # Express session type extensions
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── users.ts
│       │   ├── children.ts
│       │   ├── goals.ts
│       │   ├── activitylogs.ts
│       │   ├── nutritionlog.ts
│       │   ├── screentimelog.ts
│       │   ├── workoutideas.ts
│       │   ├── recipes.ts
│       │   ├── tips.ts
│       │   └── streaks.ts
│       └── tests/
│           └── api.test.ts
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── diet.html
│   ├── fitness.html
│   ├── screentime.html
│   ├── goals.html
│   └── assets/
│       ├── css/styles.css
│       ├── js/
│       │   ├── auth.js
│       │   └── script.js
│       └── images/
├── schema-postgres.sql
├── seed-postgres.sql
├── package.json
└── .env
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- Access to a PostgreSQL database (local or AWS RDS)

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd IS401_Final_Project

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### Database Setup

1. Copy the example env file and fill in your database credentials:

```bash
cp .env.example .env
```

2. Run the full database setup (creates tables + seeds test data):

```bash
cd backend
npm run setup
```

Or run them separately:

```bash
npm run schema   # Create tables only
npm run seed     # Insert seed data only
npm run migrate  # Run any pending migrations
```

### Running the App

**Development (backend + frontend together):**

```bash
# From the project root
npm run dev
```

This starts:
- Backend API at `http://localhost:3000`
- Frontend at `http://localhost:8080`

**Run separately:**

```bash
# Terminal 1 — backend with hot reload
cd backend
npm run dev

# Terminal 2 — frontend static server
npx serve frontend -p 8080 --no-clipboard
```

**Production build:**

```bash
cd backend
npm run build   # Compile TypeScript → dist/
npm start       # Run compiled output
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
DB_HOST=your-rds-host.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
SESSION_SECRET=your-session-secret
```

---

## API Reference

All routes except `/auth/login` and `/auth/register` require an active session.

**Base URL:** `http://localhost:3000`

---

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Login and start a session |
| `POST` | `/auth/logout` | End the current session |
| `GET` | `/auth/me` | Get the current logged-in user |

**Register body:**
```json
{
  "username": "jsmith",
  "password": "securepass",
  "firstname": "John",
  "lastname": "Smith",
  "email": "john@example.com"
}
```

**Login body:**
```json
{
  "username": "jsmith",
  "password": "securepass"
}
```

---

### Users

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | List all users |
| `GET` | `/users/:id` | Get user by ID |
| `PUT` | `/users/:id` | Update user info |
| `DELETE` | `/users/:id` | Delete user |

---

### Children

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/children` | Get children for current user |
| `GET` | `/children/:id` | Get a specific child |
| `POST` | `/children` | Add a child profile |
| `PUT` | `/children/:id` | Update a child profile |
| `DELETE` | `/children/:id` | Remove a child profile |

**POST body:**
```json
{
  "userid": 1,
  "firstname": "Emma",
  "lastname": "Smith",
  "birthdate": "2015-04-12",
  "age": 9,
  "height": 52,
  "weight": 65
}
```

---

### Goals

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/goals` | List goals (`?userid=`, `?childid=`) |
| `GET` | `/goals/:id` | Get a specific goal |
| `POST` | `/goals` | Create a goal |
| `PUT` | `/goals/:id` | Update a goal |
| `DELETE` | `/goals/:id` | Delete a goal |

**Goal categories:** `Fitness`, `Nutrition`, `Screen Time`, `Sleep`, `Hydration`, `Reading`

**POST body:**
```json
{
  "userid": 1,
  "childid": 2,
  "category": "Fitness",
  "targetvalue": 30,
  "unit": "minutes",
  "frequency": "Daily",
  "start_date": "2024-01-01",
  "end_date": "2024-03-31",
  "isactive": true
}
```

---

### Activity Logs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/activitylogs?childid=X` | Get activities for a child |
| `GET` | `/activitylogs/:id` | Get a specific activity |
| `POST` | `/activitylogs` | Log a new activity |
| `PUT` | `/activitylogs/:id` | Update an activity |
| `DELETE` | `/activitylogs/:id` | Delete an activity |

**POST body:**
```json
{
  "childid": 2,
  "activitytype": "Running",
  "duration": 30,
  "steps": 4000,
  "caloriesburned": 250,
  "repeatingflag": false
}
```

---

### Nutrition Log

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/nutritionlog?childid=X` | Get nutrition logs for a child |
| `GET` | `/nutritionlog/:id` | Get a specific entry |
| `POST` | `/nutritionlog` | Log a meal/food item |
| `PUT` | `/nutritionlog/:id` | Update an entry |
| `DELETE` | `/nutritionlog/:id` | Delete an entry |

**POST body:**
```json
{
  "childid": 2,
  "fooditem": "Apple",
  "foodgroup": "Fruit",
  "servingsize": "1 medium",
  "ishealthy": true
}
```

---

### Screen Time Log

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/screentimelog?childid=X` | Get screen time logs for a child |
| `GET` | `/screentimelog/:id` | Get a specific entry |
| `POST` | `/screentimelog` | Log screen time |
| `PUT` | `/screentimelog/:id` | Update an entry |
| `DELETE` | `/screentimelog/:id` | Delete an entry |

**POST body:**
```json
{
  "childid": 2,
  "date": "2024-01-15",
  "duration": 90,
  "devicetype": "Tablet",
  "activitytype": "Educational"
}
```

---

### Streaks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/streaks?childid=X` | Get streaks for a child |
| `GET` | `/streaks/:id` | Get a specific streak |
| `POST` | `/streaks` | Create a streak entry |
| `PUT` | `/streaks/:id` | Update a streak |
| `DELETE` | `/streaks/:id` | Delete a streak |

---

### Workout Ideas

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/workoutideas` | List workouts (`?agegroup=`, `?intensity=`) |
| `GET` | `/workoutideas/:id` | Get a specific workout |
| `POST` | `/workoutideas` | Create a workout idea |
| `PUT` | `/workoutideas/:id` | Update a workout |
| `DELETE` | `/workoutideas/:id` | Delete a workout |

---

### Recipes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/recipes` | List recipes (`?difficulty=`, `?tags=`) |
| `GET` | `/recipes/:id` | Get a specific recipe |
| `POST` | `/recipes` | Add a recipe |
| `PUT` | `/recipes/:id` | Update a recipe |
| `DELETE` | `/recipes/:id` | Delete a recipe |

---

### Tips

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tips` | List tips (`?category=`, `?agegroup=`) |
| `GET` | `/tips/:id` | Get a specific tip |
| `POST` | `/tips` | Add a tip |
| `PUT` | `/tips/:id` | Update a tip |
| `DELETE` | `/tips/:id` | Delete a tip |

---

## Database Schema

The database consists of 10 tables:

| Table | Description |
|---|---|
| `users` | Parent, Coach, and Admin accounts |
| `children` | Child profiles linked to parent users |
| `goals` | Health goals assigned to children |
| `activitylogs` | Physical activity entries |
| `nutritionlog` | Meal and food intake records |
| `screentimelog` | Device usage logs |
| `streaks` | Habit streak tracking per category |
| `workoutideas` | Suggested exercises by age/intensity |
| `recipes` | Healthy meal recipes |
| `tips` | Health tips by category and age group |

See [`schema-postgres.sql`](./schema-postgres.sql) for the full schema and [`seed-postgres.sql`](./seed-postgres.sql) for sample data (10 users, 10 children, 10 goals).

---

## Frontend Pages

| Page | File | Description |
|---|---|---|
| Home | `index.html` | Landing page with feature overview |
| Login | `login.html` | User login form |
| Register | `register.html` | New account creation |
| Diet | `diet.html` | Nutrition tracking dashboard |
| Fitness | `fitness.html` | Activity tracking dashboard |
| Screen Time | `screentime.html` | Device usage dashboard |
| Goals | `goals.html` | Goal management dashboard |

---

## Authentication

- Passwords are hashed with **bcrypt** (10 salt rounds)
- Sessions are managed via **express-session** with a 24-hour TTL
- All non-auth API routes are protected by the `requireAuth` middleware
- The frontend includes `credentials: 'include'` on all fetch requests to send session cookies

**User roles:** `parent`, `coach`, `admin`

---

## Scripts

### Root

| Script | Description |
|---|---|
| `npm run dev` | Run backend + frontend concurrently |

### Backend (`cd backend`)

| Script | Description |
|---|---|
| `npm run dev` | Start backend with hot reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run schema` | Create database tables |
| `npm run seed` | Insert seed/test data |
| `npm run setup` | Full DB setup: schema + seed + migrations |
| `npm run migrate` | Run pending migrations |
| `npm test` | Run Jest test suite |

---

## Requirements (EARS)

Requirements written using the **Easy Approach to Requirements Syntax (EARS)**.

---

### Ubiquitous Requirements

These requirements apply at all times, regardless of system state or user action.

1. The system shall allow for CRUD functionality for Nutrition.
2. The system shall allow for CRUD functionality for Screen Time.
3. The system shall allow for CRUD functionality for Exercise.
4. The system shall allow parents to create and manage child profiles.
5. The system shall store and protect family and child data in accordance with privacy requirements.

---

### Event-Driven Requirements

These requirements are triggered by a specific event or user action.

1. When goals are added, the system will remind the user of their preference.
2. When a parent logs a healthy food, the system shall update the child's daily nutrition summary.
3. When a parent logs a physical activity, the system shall update the child's daily activity summary and streaks.

---

### State-Driven Requirements

These requirements apply continuously while the system is in a particular state.

1. While a child's daily screen-time limit has been reached, the system shall display a gentle notification to the parent indicating the limit has been met.
2. While a parent is setting or adjusting goals, the system shall provide age-appropriate guidance and examples.
3. While a child has an active habit streak, the system shall display positive reinforcement without referencing weight or body size.
4. While a child's daily habits are incomplete, the system shall indicate which categories (nutrition, exercise, or screen time) still need attention.

---

## Team

IS401 Final Project
