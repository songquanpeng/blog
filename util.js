const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
const fs = require('fs');

function initializeDatabase() {
  const sql = fs.readFileSync('./database.sql').toString();
  db.exec(sql, error => {
    if (!error) {
      console.log('Database initialization succeeded.');
      insertSpecialPages();
    } else {
      console.error(error.message);
    }
  });
}

function insertSpecialPages() {
  db.get(
    'select count(1) as count where exists (select * from articles)',
    (error, data) => {
      if (error) {
        console.error(error.message);
      } else {
        if (data.count === 0) {
          const currentTime = new Date();
          const time = currentTime.toLocaleString();
          db.run(
            'INSERT INTO articles(title, author, tag, time, content, description, link, views) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            'about',
            'root',
            'page',
            time,
            '# about \n**tags:** page \n**description:** about page here\n\n Your introduce here.',
            '',
            'about',
            function(error) {
              if (error) {
                console.error(error.message);
              }
            }
          );
          db.run(
            'INSERT INTO articles(title, author, tag, time, content, description, link, views) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            'links',
            'root',
            'page',
            time,
            '# links \n**tags:** page \n**description:** links page here\n\n Your links here.',
            '',
            'links',
            function(error) {
              if (error) {
                console.error(error.message);
              }
            }
          );
          db.run(
            'INSERT INTO articles(title, author, tag, time, content, description, link, views) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
            'notice',
            'root',
            'page',
            time,
            '# notice \n**tags:** page \n**description:** notice page here\n\n Your notice here.',
            '',
            'notice',
            function(error) {
              if (error) {
                console.error(error.message);
              }
            }
          );
        }
      }
    }
  );
}

function titleToLink(title) {
  return title.trim().replace(/\s/g, '-');
}

module.exports = {
  initializeDatabase: initializeDatabase,
  db: db,
  titleToLink: titleToLink
};
