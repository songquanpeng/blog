const lexer = require('marked').lexer;
const parser = require('marked').parser;
const sanitizeHtml = require('sanitize-html');
const Option = require('../models').Option;
const Page = require('../models').Page;

function titleToLink(title) {
  return title.trim().replace(/\s/g, '-');
}

function getDate(format, dateStr) {
  if (format === undefined || format === 'default')
    format = 'yyyy-MM-dd hh:mm:ss';
  const date = new Date();
  const o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    S: date.getMilliseconds()
  };

  if (/(y+)/.test(format)) {
    format = format.replace(
      RegExp.$1,
      (date.getFullYear() + '').substr(4 - RegExp.$1.length)
    );
  }

  for (let k in o) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      );
    }
  }
  return format;
}

function md2html(markdown) {
  return parser(lexer(markdown));
}

async function updateConfig(config) {
  let options = await Option.findAll();
  options.forEach(option => {
    config[option.key] = option.value;
  });
  config.title = config.motto + ' | ' + config.site_name;
}

async function loadNoticeContent(app) {
  let page = await Page.findOne({
    where: {
      link: 'notice'
    }
  });
  if (page) {
    app.locals.notice = convertContent(page, false);
  }
}

module.exports = {
  titleToLink,
  getDate,
  md2html,
  updateConfig,
  loadNoticeContent
};
