const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(function () {
    const createBookmarkTable = '' +
        'CREATE TABLE IF NOT EXISTS bookmarks' +
        '(id integer primary key, name TEXT, tag TEXT, link TEXT)';
    db.run(createBookmarkTable);
    const createFileTable = '' +
        'CREATE TABLE IF NOT EXISTS files' +
        '(id integer primary key, name TEXT, tag TEXT, time TEXT, description TEXT, link TEXT, uploader TEXT)';
    db.run(createFileTable);
    const createCommentsTable = '' +
        'CREATE TABLE IF NOT EXISTS comments' +
        '(id integer primary key, path TEXT, time TEXT, author TEXT, content TEXT)';
    db.run(createCommentsTable);

});

class Data {
    // Bookmark Part
    static getAllBookmarks(callback) {
        db.all('SELECT * FROM bookmarks', callback);
    }

    // File Service Part
    static uploadNewFile(data, callback) {
        db.run('INSERT INTO files(name, tag, time, description, link, uploader) VALUES (?, ?, ?, ?, ?, ?)', data.name, data.tag, data.time, data.description, data.link, data.uploader, callback);
    }

    static getAllFiles(callback) {
        db.all('SELECT * FROM files', callback);
    }

    static deleteFileByName(name, callback) {
        db.run('DELETE FROM files WHERE name = ?', name, callback);
    }

    // Comment Service Part
    static getCommentBySubmitPath(path, callback) {
        db.all('SELECT * FROM comments WHERE path = ?', path, callback);
    }

    static createComment(data, callback) {
        db.run('INSERT INTO comments(path, time, author, content) VALUES (?, ?, ?, ?)', data.path, data.time, data.author, data.content, callback);
    }

    static deleteCommentBySubmitPath(path, callback) {
        db.run('DELETE FROM comments WHERE path = ?', path, callback);
    }
}

module.exports = db;
module.exports.Data = Data;