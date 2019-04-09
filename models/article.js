const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(function () {
    const createArticleTable = '' +
        'CREATE TABLE IF NOT EXISTS articles' +
        '(id integer primary key, title TEXT, author TEXT, tag TEXT, time TEXT, content TEXT, description TEXT)';
    db.run(createArticleTable);
});

class Article {
    static getAllArticlesIntroduction(callback) {
        db.all('SELECT id, title, author, tag, time, description FROM articles', callback);
    }

    static find(id, callback) {
        db.get('SELECT * FROM articles WHERE id = ?', id, callback);
    }

    static create(data, callback) {
        db.run('INSERT INTO articles(title, author, tag, time, content, description) VALUES (?, ?, ?, ?, ?, ?)', data.title, data.author, data.tag, data.time, data.content, data.description, callback);
    }

    static delete(id, callback) {
        if (id) {
            db.run('DELETE FROM articles WHERE id = ?', id, callback);
        }
    }

    static getArticlesByAuthor(author, callback){
        db.all('SELECT * FROM articles WHERE author = ?', author, callback);
    }
}

module.exports = db;
module.exports.Article = Article;