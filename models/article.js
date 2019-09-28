const db = require('../util').db;

class Article {
    static getAllArticlesIntroduction(callback) {
        db.all('SELECT id, title, author, tag, time, description, link FROM articles', callback);
    }

    static getArticleByLink(link, callback) {
        db.get('SELECT * FROM articles WHERE link = ?', link, callback);
    }

    static create(data, callback) {
        db.run('INSERT INTO articles(title, author, tag, time, content, description, link) VALUES (?, ?, ?, ?, ?, ?, ?)', data.title, data.author, data.tag, data.time, data.content, data.description, data.link, callback);
    }

    static delete(id, callback) {
        if (id) {
            db.run('DELETE FROM articles WHERE id = ?', id, callback);
        }
    }

    static getArticlesByAuthor(author, callback) {
        db.all('SELECT id, title, author, tag, time, description, link FROM articles WHERE author = ?', author, callback);
    }

    static getArticlesByTag(tag, callback) {
        db.all('SELECT id, title, author, tag, time, description, link FROM articles WHERE tag = ?', tag, callback);
    }

    static getAboutPage(callback) {
        db.get('SELECT * FROM articles WHERE author = "root" and title = "about"', callback);
    }

    static getArticleAuthorByLink(link, callback) {
        db.get('SELECT author FROM articles WHERE link = ?', link, callback);
    }

    static updateArticleByLink(link, article, callback) {
        db.run('UPDATE articles SET title = ?, author = ?, tag = ?, time = ?, content = ?, description = ?, link = ? WHERE link = ?', article.title, article.author, article.tag, article.time, article.content, article.description, article.link, link, callback);
    }
}

module.exports = db;
module.exports.Article = Article;
