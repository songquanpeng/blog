const User = require('./user');
const File = require('./file');
const Option = require('./option');
const Page = require('./page');
const sequelize = require('../common/database');

Page.belongsTo(User);
User.hasMany(Page);

// TODO: insert options!

(async () => {
  await sequelize.sync({ alter: true });
  console.log('Database configured.');
  const isNoAdminExisted =
    (await User.findOne({ where: { isAdmin: true } })) === null;
  if (isNoAdminExisted) {
    console.log('No admin user existed! Creating one for you.');
    await User.create({
      username: 'admin',
      password: '123456',
      isAdmin: true,
      isModerator: true
    });
  }
})();

exports.User = User;
exports.File = File;
exports.Option = Option;
exports.Page = Page;
