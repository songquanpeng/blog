const User = require('./user');
const File = require('./file');
const Option = require('./option');
const Page = require('./page');
const sequelize = require('../common/database');
const { hashPasswordWithSalt } = require('../common/util');

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
      password: hashPasswordWithSalt('123456'),
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
    ['author', '我的名字'],
    ['brand_image', ''],
    [
      'code_theme',
      'https://cdn.jsdelivr.net/npm/highlight.js@10.6.0/styles/solarized-light.css'
    ],
    ['copyright', ''],
    ['description', '站点描述信息'],
    ['disqus', ''],
    ['domain', 'www.your-domain.com'],
    ['extra_footer_code', ''],
    ['extra_footer_text', ''],
    ['extra_header_code', ''],
    ['favicon', ''],
    ['language', 'zh'],
    ['message_push_api', ''],
    ['motto', '我的格言'],
    [
      'nav_links',
      '[{"key": "Meta","value": [{"link":"/","text":"首页"},{"link":"/archive","text":"存档"},{"link":"/page/links","text":"友链"},{"link":"/page/about","text":"关于"}]},{"key": "其他","value": [{"link":"/admin","text":"后台管理"}, {"link":"https://github.com/songquanpeng/blog","text":"源码地址"}, {"link":"/feed.xml","text":"订阅博客"}]}]'
    ],
    ['port', '3000'],
    ['site_name', '站点名称'],
    ['theme', 'bulma'],
    ['index_page_content', ''],
    ['use_cache', 'true']
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
