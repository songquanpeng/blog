const db = require('../util').db;

class Article {
  static getAllArticlesIntroduction(callback) {
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles',
      callback
    );
  }

  static getArticleByLink(link, callback) {
    db.get('SELECT * FROM articles WHERE link = ?', link, (error, article) => {
      if (article !== undefined) {
        db.run(
          'UPDATE articles set views = ? WHERE link = ?',
          article.views + 1,
          link
        );
      }
      callback(error, article);
    });
  }

  static create(data, callback) {
    db.run(
      'INSERT INTO articles(title, author, tag, time, content, description, link, views) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      data.title,
      data.author,
      data.tag,
      data.time,
      data.content,
      data.description,
      data.link,
      callback
    );
  }

  static delete(id, callback) {
    if (id) {
      db.run('DELETE FROM articles WHERE id = ?', id, callback);
    }
  }

  static getArticlesByAuthor(author, callback) {
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles WHERE author = ?',
      author,
      callback
    );
  }

  static getArticlesByDate(date, callback) {
    const year = date.split('-')[0];
    const mouth = date.split('-')[1];
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles WHERE time like ?',
      mouth + '/%/' + year + '%',
      callback
    );
  }

  static getArticlesByTag(tag, callback) {
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles WHERE tag like ?',
      '%' + tag + '%',
      callback
    );
  }

  static getSpecialPage(pageName, callback) {
    db.get(
      'SELECT * FROM articles WHERE author = "root" and title = ?',
      pageName.toLowerCase(),
      callback
    );
  }

  static getArticleAuthorByLink(link, callback) {
    db.get('SELECT author FROM articles WHERE link = ?', link, callback);
  }

  static updateArticleByLink(link, article, callback) {
    db.run(
      'UPDATE articles SET title = ?, author = ?, tag = ?, time = ?, content = ?, description = ?, link = ? WHERE link = ?',
      article.title,
      article.author,
      article.tag,
      article.time,
      article.content,
      article.description,
      article.link,
      link,
      callback
    );
  }
}

module.exports = db;
module.exports.Article = Article;
