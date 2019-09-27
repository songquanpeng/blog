CREATE TABLE articles(
id integer primary key,
title TEXT,
author TEXT,
tag TEXT,
time TEXT,
content TEXT,
description TEXT);

CREATE TABLE IF NOT EXISTS bookmarks(
id integer primary key,
name TEXT,
tag TEXT,
link TEXT);

CREATE TABLE IF NOT EXISTS chats(
id integer primary key,
author TEXT,
time TEXT,
content TEXT);

CREATE TABLE IF NOT EXISTS comments(
id integer primary key,
path TEXT,
time TEXT,
author TEXT,
content TEXT);

CREATE TABLE IF NOT EXISTS files(
id integer primary key,
name TEXT,
tag TEXT,
time TEXT,
description TEXT,
link TEXT,
uploader TEXT);

CREATE TABLE system_log(
logID integer,
time varchar(30),
name varchar(10),
ip varchar(20),
primary key (logID));

CREATE TABLE users(
id integer primary key,
name TEXT UNIQUE,
password TEXT,
level integer);
