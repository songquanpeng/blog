const db = require('../utils/database').db;
const uuid = require('uuid/v1');

class Page {
  all(callback) {
    db('pages')
      .select([
        'pages.id as page_id',
        'pages.user_id as author_id',
        'type',
        'link',
        'page_status',
        'comment_status',
        'post_time',
        'edit_time',
        'title',
        'content',
        'tag',
        'view',
        'up_vote',
        'down_vote',
        'users.username as username',
        'users.display_name as author'
      ])
      .innerJoin('users', 'users.id', 'author_id')
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
          callback(false, error.message, undefined);
        } else if (data.length === 0) {
          callback(false, `No page has id ${id}.`, undefined);
        } else {
          callback(true, '', data[0]);
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
        } else if (data.length === 0) {
          callback(false, `No page has link ${link}.`, undefined);
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
          this.loadPages();
        }
      });
  }

  add(page, callback) {
    page.id = uuid();
    db('pages')
      .insert(page)
      .asCallback(error => {
        if (error) {
          console.error(error.message);
          callback(false, error.message, undefined);
        } else {
          callback(true, '', page.id);
          this.loadPages();
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
          this.loadPages();
        }
      });
  }
}
const page = new Page();
module.exports.Page = page;
