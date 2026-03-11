-- Healthy Habits - PostgreSQL Schema
-- Adapted from schema.sql (MySQL) for PostgreSQL compatibility.
-- Key changes from MySQL original:
--   AUTO_INCREMENT  →  SERIAL
--   DATETIME        →  TIMESTAMP
--   DROP TABLE needs CASCADE to respect foreign key order

DROP TABLE IF EXISTS screentimelog CASCADE;
DROP TABLE IF EXISTS nutritionlog CASCADE;
DROP TABLE IF EXISTS activitylogs CASCADE;
DROP TABLE IF EXISTS streaks CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS workoutideas CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS tips CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    passwordhash VARCHAR(50) NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL,
    userrole VARCHAR(50) NOT NULL,
    datecreated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastlogin TIMESTAMP
);

CREATE TABLE children (
    childid SERIAL PRIMARY KEY,
    userid INT NOT NULL,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    birthdate TIMESTAMP NOT NULL,
    age INT NOT NULL,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    datecreated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(userid)
);

CREATE TABLE activitylogs (
    activityid SERIAL PRIMARY KEY,
    childid INT NOT NULL,
    activitytype VARCHAR(50) NOT NULL,
    timecreated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration INT NOT NULL,
    steps INT,
    caloriesburned INT,
    repeatingflag BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (childid) REFERENCES children(childid)
);

CREATE TABLE goals (
    goalid SERIAL PRIMARY KEY,
    userid INT NOT NULL,
    childid INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    targetvalue INT NOT NULL,
    goaltype VARCHAR(50) NOT NULL,
    value INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    isactive BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (userid) REFERENCES users(userid),
    FOREIGN KEY (childid) REFERENCES children(childid)
);

CREATE TABLE workoutideas (
    workoutid SERIAL PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    instructions VARCHAR(200),
    agegroup VARCHAR(50) NOT NULL,
    durationminutes INT NOT NULL,
    intensity VARCHAR(50) NOT NULL,
    equipment VARCHAR(50),
    location VARCHAR(50),
    tags VARCHAR(50),
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdbyuserid INT NOT NULL,
    FOREIGN KEY (createdbyuserid) REFERENCES users(userid)
);

CREATE TABLE recipes (
    recipeid SERIAL PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    instructions VARCHAR(200),
    nutritioninfo VARCHAR(50),
    prepminutes INT NOT NULL,
    cookminutes INT NOT NULL,
    servings INT NOT NULL,
    tags VARCHAR(50),
    imageurl VARCHAR(50),
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdbyuserid INT NOT NULL,
    FOREIGN KEY (createdbyuserid) REFERENCES users(userid)
);

CREATE TABLE nutritionlog (
    nutritionlogid SERIAL PRIMARY KEY,
    childid INT NOT NULL,
    fooditem VARCHAR(50) NOT NULL,
    foodgroup VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    servingsize INT NOT NULL,
    ishealthy BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (childid) REFERENCES children(childid)
);

CREATE TABLE screentimelog (
    screentimelogid SERIAL PRIMARY KEY,
    childid INT NOT NULL,
    date TIMESTAMP NOT NULL,
    duration INT NOT NULL,
    devicetype VARCHAR(50) NOT NULL,
    activitytype VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (childid) REFERENCES children(childid)
);

CREATE TABLE streaks (
    streakid SERIAL PRIMARY KEY,
    childid INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    currentstreak INT NOT NULL DEFAULT 0,
    longeststreak INT NOT NULL DEFAULT 0,
    lastupdated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (childid) REFERENCES children(childid)
);

CREATE TABLE tips (
    tipid SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    content VARCHAR(50) NOT NULL,
    agegroup VARCHAR(50) NOT NULL,
    isactive BOOLEAN NOT NULL DEFAULT TRUE
);
