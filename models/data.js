const db = require('../utils/util').db;

class Data {
  static getCommentBySubmitPath(path, callback) {
    db.all('SELECT * FROM comments WHERE path = ?', path, callback);
  }

  static createComment(data, callback) {
    db.run(
      'INSERT INTO comments(path, time, author, content) VALUES (?, ?, ?, ?)',
      data.path,
      data.time,
      data.author,
      data.content,
      callback
    );
  }

  static deleteCommentBySubmitPath(path, callback) {
    db.run('DELETE FROM comments WHERE path = ?', path, callback);
  }

  static getActiveMessage(callback) {
    db.all('SELECT * FROM messages where state = 1', callback);
  }

  static createMessage(data, callback) {
    db.run(
      'INSERT INTO messages(title, content, state, time) VALUES (?, ?, 1, ?)',
      data.title,
      data.content,
      data.time,
      callback
    );
  }

  static deactivateMessage(id, callback) {
    db.run('UPDATE messages SET state = 0 where id = ?', id, callback);
  }

  static createStatisticsRecord() {
    const time = new Date().toLocaleString();
    const date = time.split(',')[0];
    db.run(
      'INSERT INTO statistics(pv, uv, date) SELECT 0, 0, ? where not exists (select 1 from statistics where date = ?)',
      date,
      date,
      error => {
        if (error) {
          console.error(error.message);
        }
      }
    );
  }

  static getStatistics(number, callback) {
    db.all(
      'SELECT * from statistics ORDER BY id DESC LIMIT ?',
      number,
      callback
    );
  }
}

module.exports = db;
module.exports.Data = Data;
