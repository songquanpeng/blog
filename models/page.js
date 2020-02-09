const db = require('../utils/database').db;

class Page {
  all(callback) {
    db('pages')
      .select()
      .asCallback((error, pages) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, pages);
        } else {
          callback(true, '', pages);
        }
      });
  }

  loadPages(callback) {
    db('pages')
      .select([
        'pages.id as page_id',
        'pages.user_id as author_id',
        'type',
        'link',
        'page_status',
        'post_time',
        'title',
        'content',
        'tag',
        'view',
        'users.username as username',
        'users.display_name as author'
      ])
      .innerJoin('users', 'users.id', 'author_id')
      .asCallback((error, pages) => {
        if (error) {
          console.error(error.message);
        }
        pages.sort((a, b) => {
          return new Date(b.post_time) - new Date(a.post_time);
        });
        let newPages = pages.slice(0, 3);
        let sortedPages = pages.slice(3);
        this.pages = newPages.concat(sortedPages);
        if (callback) {
          callback();
        }
      });
  }

  getByRange(start, number, callback) {
    if (this.pages) {
      callback(this.pages.slice(start, start + number));
    } else {
      this.loadPages(() => {
        callback(this.pages.slice(start, start + number));
      });
    }
  }

  getById(id, callback) {
    db('pages')
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

  getByLink(link, callback) {
    db('pages')
      .where('link', link)
      .asCallback((error, data) => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          callback(true, '', data[0]);
        }
      });
  }

  updateById(id, page, callback) {
    db('pages')
      .where('id', id)
      .update(page)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }

  add(page, callback) {
    db('pages')
      .insert(page)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message);
        } else {
          callback(true, '');
        }
      });
  }

  delete(id, callback) {
    db('pages')
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
const page = new Page();
module.exports.Page = page;
