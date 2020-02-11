const db = require('../utils/database').db;
const uuid = require('uuid/v1');

class Comment {
  add(comment, callback) {
    comment.id = uuid();
    db('comments')
      .insert(comment)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }

  getByPageId(id, callback) {
    db('comments')
      .where('page_id', id)
      .asCallback((error, data) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          callback(true, '', data);
        }
      });
  }

  deleteById(id, callback) {
    db('comments')
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

let comment = new Comment();
module.exports.Comment = comment;
