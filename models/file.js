const db = require('../utils/database').db;
const fs = require('fs');

const upload_path = './public/upload';

class File {
  all(callback) {
    db('files')
      .select()
      .asCallback((error, data) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          callback(true, '', data);
        }
      });
  }

  add(file, callback) {
    db('files')
      .insert(file)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }

  getById(id, callback) {
    db('files')
      .where('id', id)
      .asCallback((error, data) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else if (!data || data.length === 0) {
          callback(false, 'no such file with id: ' + id, undefined);
        } else {
          callback(true, '', data[0]);
        }
      });
  }

  deleteById(id, callback) {
    db('files')
      .where('id', id)
      .del()
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          fs.unlink(upload_path + '/' + id, error => {
            if (error) {
              console.error(error);
              callback(false, error.message);
            } else {
              callback(true, '');
            }
          });
        }
      });
  }

  search(keyword, callback) {
    db('files')
      .select()
      .whereRaw('LOWER(filename) LIKE ?', `%${keyword.toLowerCase()}%`)
      .orWhereRaw('LOWER(description) LIKE ?', `%${keyword.toLowerCase()}%`)
      .asCallback((error, files) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          callback(true, '', files);
        }
      });
  }
}

let file = new File();
module.exports.File = file;
module.exports.upload_path = upload_path;
