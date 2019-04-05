const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(function () {
    const createArticleTable = '' +
        'CREATE TABLE IF NOT EXISTS articles' +
        '(id integer primary key, title TEXT, tag TEXT, time TEXT, content TEXT, description TEXT)';
    db.run(createArticleTable);
});

class Article {
    static all(callback) {
        db.all('SELECT id, title, tag, time, description FROM articles', callback);
    }

    static find(id, callback) {
        db.get('SELECT * FROM articles WHERE id = ?', id, callback);
    }

    static create(data, callback) {
        db.run('INSERT INTO articles(title, tag, time, content, description) VALUES (?, ?, ?, ?, ?)', data.title, data.tag, data.time, data.content, data.description, callback);
    }

    static delete(id, callback) {
        if (id) {
            db.run('DELETE FROM articles WHERE id = ?', id, callback);
        }
    }
}

module.exports = db;
module.exports.Article = Article;