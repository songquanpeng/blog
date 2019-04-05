const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(function () {
    const createArticleTable = '' +
        'CREATE TABLE IF NOT EXISTS bookmarks' +
        '(id integer primary key, name TEXT, tag TEXT, link TEXT)';
    db.run(createArticleTable);
});

class Bookmark {
    static all(callback) {
        db.all('SELECT * FROM bookmarks', callback);
    }

    static find(id, callback) {
        db.get('SELECT * FROM bookmarks WHERE id = ?', id, callback);
    }

    static create(data, callback) {
        db.run('INSERT INTO bookmarks(name, tag, link) VALUES (?, ?, ?)', data.name, data.tag, data.link, callback);
    }

    static delete(id, callback) {
        if (id) {
            db.run('DELETE FROM bookmarks WHERE id = ?', id, callback);
        }
    }
}

module.exports = db;
module.exports.Bookmark = Bookmark;