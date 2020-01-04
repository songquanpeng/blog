const knex = require('knex');
const sqlite3 = require('sqlite3').verbose();
const sqlite3Db = new sqlite3.Database('data.db');
const fs = require('fs');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: 'data.db'
  },
  useNullAsDefault: true
});

module.exports = {
  db: db
};
