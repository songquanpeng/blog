const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(function () {
    const createBookmarkTable = '' +
        'CREATE TABLE IF NOT EXISTS bookmarks' +
        '(id integer primary key, name TEXT, tag TEXT, link TEXT)';
    db.run(createBookmarkTable);
    const createFileTable = '' +
        'CREATE TABLE IF NOT EXISTS files' +
        '(id integer primary key, name TEXT, tag TEXT, time TEXT, description TEXT)';
    db.run(createFileTable);
});

class Data {
    static getAllBookmarks(callback) {
        db.all('SELECT * FROM bookmarks', callback);
    }

    static uploadNewFile(data, callback) {
        db.run('INSERT INTO files(name, tag, time, description) VALUES (?, ?, ?, ?)', data.name, data.tag, data.time, data.description, callback);
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
module.exports.Data = Data;