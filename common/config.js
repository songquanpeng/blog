const { convertContent } = require('./cache');
const Option = require('../models').Option;
const Page = require('../models').Page;

async function updateConfig(config) {
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
