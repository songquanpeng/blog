const db = require('../util').db;

class Article {
    static getAllArticlesIntroduction(callback) {
        db.all('SELECT id, title, author, tag, time, description, link FROM articles', callback);
    }

    static find(link, callback) {
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

    static getArticlesByAuthor(author, callback){
        db.all('SELECT id, title, author, tag, time, description, link FROM articles WHERE author = ?', author, callback);
    }

    static getAboutPage(callback){
        db.get('SELECT * FROM articles WHERE author = "root" and title = "about"', callback);
    }
}

module.exports = db;
module.exports.Article = Article;
