const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');

db.serialize(function () {
    const createUserTable = "" +
        "CREATE TABLE IF NOT EXISTS users" +
        "(id integer primary key, name TEXT UNIQUE, password TEXT, level integer)";
    db.run(createUserTable);
});

class User {
    static all(callback) {
        db.all('SELECT * FROM users', callback);
    }

    static find(name, callback) {
        db.get('SELECT * FROM users WHERE name = ?', name, callback);
    }

    static getUserPermission(name, callback){
        db.get('SELECT level FROM users WHERE name = ?', name, callback);
    }

    static create(data, callback) {
        db.run('INSERT INTO users(name, password) VALUES (?, ?)', data.name, data.password, callback);
    }

    static delete(name, callback) {
        if (name) {
            db.run('DELETE FROM users WHERE name = ?', name, callback);
        }
    }

    static update(oldName, newName, newPassword, callback) {
        db.run('UPDATE users SET name = ?, password = ? WHERE name = ?', [newName, newPassword, oldName], callback);
    }

    static checkCredential(name, password, callback) {
        this.find(name, (error, user) => {
            //console.log("database" + JSON.stringify(user));
            if (error) {
                callback(false);
            } else {
                if (user === undefined) {
                    callback(false);
                } else {
                    callback(user.password === password);
                }
            }
        });
    }
}

module.exports = db;
module.exports.User = User;