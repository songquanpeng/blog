const db = require('../utils/database').db;

class User {
  static all(callback) {
    db('users')
      .select()
      .asCallback((error, users) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, users);
        } else {
          callback(true, '', users);
        }
      });
  }

  static getById(id, callback) {
    db('users')
      .where('id', id)
      .asCallback((error, data) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, data[0]);
        } else {
          callback(true, '', undefined);
        }
      });
  }

  static updateById(id, user, callback) {
    db('users')
      .where('id', id)
      .update(user)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }

  static register(user, callback) {
    db('users')
      .insert(user)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }

  static check(username, password, callback) {
    db('users')
      .select()
      .where({
        username: username,
        password: password
      })
      .asCallback((error, data) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          if (data[0]) {
            callback(true, '', data[0]);
          } else {
            callback(false, 'Invalid credentials.', undefined);
          }
        }
      });
  }

  static delete(id, callback) {
    db('users')
      .where('id', id)
      .del()
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }
}

module.exports.User = User;
