const User = require('./user');
const File = require('./file');
const Option = require('./option');
const Page = require('./page');
const sequelize = require('../common/database');

Page.belongsTo(User);
User.hasMany(Page);

async function initializeDatabase() {
  // The following code will cause the UserId be deleted on startup. :(
  // await sequelize.sync({ alter: true });
  await sequelize.sync();
  console.log('Database configured.');
  const isNoAdminExisted =
    (await User.findOne({ where: { isAdmin: true } })) === null;
  if (isNoAdminExisted) {
    console.log('No admin user existed! Creating one for you.');
    await User.create({
      username: 'admin',
      password: '123456',
      displayName: 'Administrator',
      isAdmin: true,
      isModerator: true
    });
  }
  await initializeOptions();
}

async function initializeOptions() {
  let plainOptions = [
    ['ad', ''],
    ['allow_comments', 'true'],
    ['author', 'My Name'],
    ['brand_image', ''],
    [
      'code_theme',
      'https://cdn.jsdelivr.net/npm/highlight.js@10.6.0/styles/solarized-light.css'
    ],
    ['copyright', ''],
    ['description', 'My site description.'],
    ['disqus', ''],
    ['domain', 'www.your-domain.com'],
    ['extra_footer_code', ''],
    ['extra_footer_text', ''],
    ['extra_header_code', ''],
    ['favicon', ''],
    ['language', 'zh'],
    ['message_push_api', ''],
    ['motto', 'My motto.'],
    [
      'nav_links',
      '[{"key": "Meta","value": [{"link":"/","text":"Home"},{"link":"/archive","text":"Archive"},{"link":"/page/links","text":"Links"},{"link":"/page/about","text":"About"}]},{"key": "Example Dropdown","value": [{"link":"/admin","text":"Admin"}, {"link":"https://github.com/songquanpeng/express-react-blog","text":"Star"}, {"link":"/feed.xml","text":"Feed"}]}]'
    ],
    ['port', '3000'],
    ['site_name', 'Site Name'],
    ['theme', 'bulma']
  ];
  for (const option of plainOptions) {
    let [key, value] = option;
    await Option.findOrCreate({ where: { key }, defaults: { value } });
  }
}
exports.initializeDatabase = initializeDatabase;
exports.User = User;
exports.File = File;
exports.Option = Option;
exports.Page = Page;
