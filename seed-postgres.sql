-- Healthy Habits - PostgreSQL Seed Data
-- Adapted from seed.sql (MySQL) for PostgreSQL compatibility.
-- Column names match schema-postgres.sql (all lowercase).

-- Users
INSERT INTO users (userid, username, passwordhash, firstname, lastname, email, userrole, datecreated, lastlogin) VALUES
(1,  'jparker',    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'Jamie',    'Parker',   'jamie@healthyhabits.com',   'parent',  '2025-01-10 08:00:00', '2026-02-17 09:15:00'),
(2,  'sthompson',  'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3', 'Sara',     'Thompson', 'sara@healthyhabits.com',    'parent',  '2025-02-14 10:30:00', '2026-02-16 18:45:00'),
(3,  'mreyes',     'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', 'Marco',    'Reyes',    'marco@healthyhabits.com',   'parent',  '2025-03-01 12:00:00', '2026-02-15 07:30:00'),
(4,  'lchen',      'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5', 'Lisa',     'Chen',     'lisa@healthyhabits.com',    'parent',  '2025-03-20 09:00:00', '2026-02-17 11:00:00'),
(5,  'dwilson',    'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6', 'Derek',    'Wilson',   'derek@healthyhabits.com',   'parent',  '2025-04-05 14:00:00', '2026-02-14 20:00:00'),
(6,  'amorales',   'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', 'Ana',      'Morales',  'ana@healthyhabits.com',     'parent',  '2025-05-12 07:45:00', '2026-02-17 08:00:00'),
(7,  'coachkim',   'a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3', 'Kim',      'Nguyen',   'kim@healthyhabits.com',     'coach',   '2025-01-05 08:00:00', '2026-02-17 10:30:00'),
(8,  'nutrijess',  'b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4', 'Jessica',  'Adams',    'jessica@healthyhabits.com', 'coach',   '2025-01-08 09:00:00', '2026-02-16 14:00:00'),
(9,  'adminalex',  'c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5', 'Alex',     'Rivera',   'alex@healthyhabits.com',    'admin',   '2025-01-01 00:00:00', '2026-02-17 12:00:00'),
(10, 'tblake',     'd5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6', 'Tanya',    'Blake',    'tanya@healthyhabits.com',   'parent',  '2025-06-01 11:00:00', '2026-02-13 16:30:00');

SELECT setval('users_userid_seq', 10);

-- Children
INSERT INTO children (childid, userid, firstname, lastname, birthdate, age, height, weight, datecreated) VALUES
(1,  1, 'Avery',    'Parker',   '2015-06-15', 10, 54.50, 72.00,  '2025-01-10 08:05:00'),
(2,  1, 'Jordan',   'Parker',   '2017-09-22', 8,  48.25, 58.50,  '2025-01-10 08:06:00'),
(3,  2, 'Mia',      'Thompson', '2014-03-10', 11, 57.00, 80.00,  '2025-02-14 10:35:00'),
(4,  2, 'Ethan',    'Thompson', '2016-11-05', 9,  50.75, 64.00,  '2025-02-14 10:36:00'),
(5,  3, 'Sofia',    'Reyes',    '2015-01-28', 10, 55.00, 74.50,  '2025-03-01 12:05:00'),
(6,  4, 'Lucas',    'Chen',     '2013-08-19', 12, 60.25, 92.00,  '2025-03-20 09:05:00'),
(7,  4, 'Emma',     'Chen',     '2016-04-03', 9,  49.50, 60.00,  '2025-03-20 09:06:00'),
(8,  5, 'Noah',     'Wilson',   '2014-12-01', 11, 58.00, 85.00,  '2025-04-05 14:05:00'),
(9,  6, 'Isabella', 'Morales',  '2015-07-20', 10, 53.75, 70.00,  '2025-05-12 07:50:00'),
(10, 10,'Caleb',    'Blake',    '2016-02-14', 9,  51.00, 66.00,  '2025-06-01 11:05:00');

SELECT setval('children_childid_seq', 10);

-- Goals
INSERT INTO goals (goalid, userid, childid, category, targetvalue, goaltype, value, unit, start_date, end_date, frequency, isactive) VALUES
(1,  1, 1, 'Fitness',     10000, 'Steps',           8200, 'steps',    '2026-02-01', '2026-02-28', 'Daily',   TRUE),
(2,  1, 1, 'Reading',     20,    'Duration',          15, 'minutes',  '2026-02-01', '2026-02-28', 'Daily',   TRUE),
(3,  1, 2, 'Fitness',     8000,  'Steps',            6900, 'steps',    '2026-02-01', '2026-02-28', 'Daily',   TRUE),
(4,  2, 3, 'Nutrition',   5,     'Veggie Servings',    4, 'servings', '2026-02-01', '2026-02-28', 'Daily',   TRUE),
(5,  2, 4, 'Screen Time', 2,     'Limit',              1, 'hours',    '2026-02-01', '2026-02-28', 'Daily',   TRUE),
(6,  3, 5, 'Fitness',     150,   'Active Minutes',   120, 'minutes',  '2026-02-10', '2026-03-10', 'Weekly',  TRUE),
(7,  4, 6, 'Hydration',   8,     'Water Intake',       6, 'cups',     '2026-01-15', '2026-04-15', 'Daily',   TRUE),
(8,  4, 7, 'Sleep',       10,    'Duration',           9, 'hours',    '2026-02-01', '2026-02-28', 'Daily',   TRUE),
(9,  5, 8, 'Fitness',     5,     'Workouts',           3, 'sessions', '2026-02-01', '2026-02-28', 'Weekly',  TRUE),
(10, 6, 9, 'Reading',     30,    'Duration',          25, 'minutes',  '2026-02-01', '2026-02-28', 'Daily',   FALSE);

SELECT setval('goals_goalid_seq', 10);
