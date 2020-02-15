const db = require('../utils/database').db;
const uuid = require('uuid/v1');

class Option {
  all(callback) {
    db('options').asCallback((error, options) => {
      if (error) {
        console.error(error.message);
        callback(false, error.message, options);
      } else {
        callback(true, '', options);
      }
    });
  }

  search(keyword, callback) {
    db('options')
      .andWhere(builder => {
        builder.whereRaw('LOWER(name) LIKE ?', `%${keyword.toLowerCase()}%`);
      })
      .asCallback((error, options) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          callback(true, '', options);
        }
      });
  }

  get(name, callback) {
    db('options')
      .where('name', name)
      .asCallback((error, data) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else if (data.length === 0) {
          callback(false, `No options has name ${name}.`, undefined);
        } else {
          callback(true, '', data[0]);
        }
      });
  }

  update(name, option, callback) {
    db('options')
      .where('name', name)
      .update(option)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }

  add(option, callback) {
    option.id = uuid();
    db('options')
      .insert(option)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          callback(true, '', option.id);
        }
      });
  }

  delete(name, callback) {
    db('options')
      .where('name', name)
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
const option = new Option();
module.exports.Option = option;
