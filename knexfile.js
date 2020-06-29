module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './data.db'
    }
  },

  staging: {
    client: 'sqlite3',
    connection: {
      filename: './data.db'
    }
  },

  production: {
    client: 'sqlite3',
    connection: {
      filename: './data.db'
    }
  }
};

/*
MySQL example:
production: {
  client: 'mysql',
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: 'root',
    database: 'blog'
  }
}

SQLite example:
production: {
  client: 'sqlite3',
  connection: {
    filename: './data.db'
  }
}
 */
