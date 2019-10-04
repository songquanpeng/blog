const db = require('../util').db;
const fs = require("fs");
const uploadPath = "~/uploadPath/";

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
        fs.unlink(uploadPath + '\\' + name, (error) => {
            if (error) throw error;
            console.log("delete file: " + name);
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
    static getAllChats(callback) {
        db.all('SELECT * FROM chats', callback)
    }

    static getRecentChats(callback) {
        db.all('SELECT * FROM chats order by id desc limit 10 ', callback)
    }

    static createChat(data, callback) {
        db.run('INSERT INTO chats(author, time, content) VALUES (?, ?, ?)', data.author, data.time, data.content, callback);
    }

    static getActiveMessage(callback) {
        db.all('SELECT * FROM messages where state = 1', callback);
    }

    static createMessage(data, callback) {
        db.run('INSERT INTO messages(title, content, state, time) VALUES (?, ?, 1, ?)', data.title, data.content, data.time, callback);
    }

    static deactivateMessage(id, callback) {
        db.run('UPDATE messages SET state = 0 where id = ?', id, callback);
    }

}

module.exports = db;
module.exports.Data = Data;
module.exports.uploadPath = uploadPath;
