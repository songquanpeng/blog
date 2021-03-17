const sqlite3 = require('sqlite3');
const oldDb = new sqlite3.Database('./old.db');
const { initializeDatabase, Page, User, Option } = require('../models');

async function getAdminId() {
  let user = await User.findOne({
    where: {
      username: 'admin'
    },
    raw: true
  });
  return user.id;
}

async function migratePages() {
  let id = await getAdminId();
  oldDb.all('select * from pages', [], (err, pages) => {
    if (err) {
      console.error(err);
    }
    pages.forEach(async page => {
      try {
        let pageObj = await Page.create({
          type: page.type,
          link: page.link,
          pageStatus: page.page_status,
          commentStatus: page.comment_status,
          title: page.title,
          content: page.content,
          tag: page.tag,
          description: page.description,
          password: page.password,
          view: page.view,
          upVote: page.up_vote,
          downVote: page.down_vote,
          UserId: id,
          createdAt: page.post_time,
          updatedAt: page.edit_time
        });
      } catch (e) {
        console.error(e);
      }
    });
  });
}

async function migrateOptions() {
  oldDb.all('select * from options', [], (err, options) => {
    if (err) {
      console.error(err);
    }
    options.forEach(async option => {
      try {
        let optionObj = await Option.findOne({
          where: {
            key: option.name
          }
        });
        await optionObj.update({
          key: option.name,
          value: option.value
        });
      } catch (e) {
        console.error(e);
      }
    });
  });
}

(async () => {
  await initializeDatabase();
  await migratePages();
  await migrateOptions();
})();
