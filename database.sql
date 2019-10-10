CREATE TABLE IF NOT EXISTS articles(
id integer primary key,
title TEXT,
author TEXT,
tag TEXT,
time TEXT,
content TEXT,
link TEXT,
views integer,
description TEXT);

CREATE TABLE IF NOT EXISTS comments(
id integer primary key,
path TEXT,
time TEXT,
author TEXT,
content TEXT);

CREATE TABLE IF NOT EXISTS users(
id integer primary key,
name TEXT UNIQUE,
password TEXT,
level integer);

CREATE TABLE IF NOT EXISTS messages(
id integer primary key,
title TEXT,
content TEXT,
state integer,
time TEXT);

CREATE TABLE IF NOT EXISTS statistics(
id integer primary key,
pv integer,
uv integer,
date TEXT);

INSERT into users (name, password, level)
SELECT "root", "toor", 0
WHERE not exists( SELECT 1 from users WHERE level = 0);
