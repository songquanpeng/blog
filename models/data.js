const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
const fs = require("fs");
const uploadPath =  "D:\\Project\\Web\\www\\public\\upload";

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
    const createChatsTable = '' +
        'CREATE TABLE IF NOT EXISTS chats' +
        '(id integer primary key, author TEXT, time TEXT, content TEXT)';
    db.run(createChatsTable);

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
        fs.unlink(uploadPath+'\\'+name, (error)=>{
            if (error) throw error;
            console.log("delete file: "+name);
            db.run('DELETE FROM files WHERE name = ?', name, callback);
        });
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

    // Chat Service Part
    static getAllChats(callback){
        db.all('SELECT * FROM chats', callback)
    }

    static getRecentChats(callback){
        db.all('SELECT * FROM chats order by id desc limit 10 ', callback)
    }

    static createChat(data, callback){
        db.run('INSERT INTO chats(author, time, content) VALUES (?, ?, ?)', data.author, data.time, data.content, callback);
    }
}

module.exports = db;
module.exports.Data = Data;
module.exports.uploadPath = uploadPath;
