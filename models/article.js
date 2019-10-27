const db = require('../utils/util').db;

class Article {
  constructor() {
    this.loadArticles();
  }

  loadArticles() {
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles',
      (error, articles) => {
        if (error) {
          console.error(error.message);
        }
        articles.sort(function(a, b) {
          return new Date(b.time) - new Date(a.time);
        });
        let newArticles = articles.slice(0, 3);
        let sortedArticles = articles.slice(3);
        sortedArticles.sort(function(a, b) {
          return b.views - a.views;
        });
        this.articles = newArticles.concat(sortedArticles);
      }
    );
  }

  create(data, callback) {
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
    this.loadArticles();
  }

  delete(id, callback) {
    if (id) {
      db.run('DELETE FROM articles WHERE id = ?', id, callback);
      this.loadArticles();
    }
  }

  updateArticleByLink(link, article, callback) {
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
    this.loadArticles();
  }

  getArticlesByRange(start, number) {
    return this.articles.slice(start, start + number);
  }

  getArticleByLink(link, callback) {
    db.get('SELECT * FROM articles WHERE link = ?', link, (error, article) => {
      if (article !== undefined) {
        db.run(
          'UPDATE articles set views = ? WHERE link = ?',
          article.views + 1,
          link
        );
        // Update statistics pv
        const time = new Date().toLocaleString();
        const date = time.split(',')[0];
        db.run('UPDATE statistics set pv = pv + 1 WHERE date = ?', date);
      }
      callback(error, article);
    });
  }

  getArticlesByAuthor(author, callback) {
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles WHERE author = ?',
      author,
      callback
    );
  }

  getArticlesByDate(date, callback) {
    const year = date.split('-')[0];
    const mouth = date.split('-')[1];
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles WHERE time like ?',
      mouth + '/%/' + year + '%',
      callback
    );
  }

  getArticlesByTag(tag, callback) {
    db.all(
      'SELECT id, title, author, tag, time, description, link, views FROM articles WHERE tag like ?',
      '%' + tag + '%',
      callback
    );
  }

  getSpecialPage(pageName, callback) {
    db.get(
      'SELECT * FROM articles WHERE author = "root" and title = ?',
      pageName.toLowerCase(),
      callback
    );
  }

  getArticleAuthorByLink(link, callback) {
    db.get('SELECT author FROM articles WHERE link = ?', link, callback);
  }
}

module.exports = db;
const article = new Article();
module.exports.Article = article;
