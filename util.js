const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
const fs = require('fs');

function initializeDatabase() {
    const sql = fs.readFileSync('./database.sql').toString();
    db.exec(sql, error => {
        if (!error) {
            console.log("Database initialization succeeded.");
        } else {
            console.error(error.message);
        }
    });
}

function titleToLink(title) {
    return title.trim().replace(" ","-");
}

module.exports = {
    initializeDatabase: initializeDatabase,
    db: db,
    titleToLink: titleToLink
};
