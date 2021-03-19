const { convertContent } = require('./cache');
const Option = require('../models').Option;
const Page = require('../models').Page;
const path = require('path');

async function updateConfig(app) {
  let config = app.locals.config;
  try {
    let options = await Option.findAll();
    options.forEach(option => {
      config[option.key] = option.value;
    });
    config.title = config.motto + ' | ' + config.site_name;
  } catch (e) {
    console.error('Unable to update config.');
    console.error(e);
  }
  app.cache = {};
  app.set(
    'views',
    path.join(__dirname, `../themes/${app.locals.config.theme}`)
  );
}

async function loadNoticeContent(app) {
  let page = await Page.findOne({
    where: {
      link: 'notice'
    },
    raw: true
  });
  if (page) {
    app.locals.notice = convertContent(page, true);
  }
}

module.exports = {
  updateConfig,
  loadNoticeContent
};
