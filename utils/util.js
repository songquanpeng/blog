const lexer = require('marked').lexer;
const parser = require('marked').parser;
const sanitizeHtml = require('sanitize-html');
const PAGE_TYPE = require('../utils/constant').PAGE_TYPE;
const Option = require('../models/option').Option;
const Page = require('../models/page').Page;

function titleToLink(title) {
  return title.trim().replace(/\s/g, '-');
}

function getDate(format) {
  if (format === undefined) format = 'yyyy-MM-dd hh:mm:ss';
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

function updateConfig(config, callback) {
  Option.all((status, message, options) => {
    if (status) {
      options.forEach(option => {
        config[option.name] = option.value;
      });
      config.title = config.motto + ' | ' + config.site_name;
      callback();
    } else {
      console.error('Unable to load config from database: ', message);
    }
  });
}

function convertContent(pageType, content) {
  let lines = content.split('\n');
  let deleteCount = 0;
  for (let i = 1; i < lines.length; ++i) {
    let line = lines[i];
    if (line.startsWith('---')) {
      deleteCount = i + 1;
      break;
    }
  }
  lines.splice(0, deleteCount);

  if (pageType === PAGE_TYPE.ARTICLE || pageType === PAGE_TYPE.DISCUSS) {
    return md2html(lines.join('\n'));
  } else if (pageType === PAGE_TYPE.LINKS) {
    let linkList = [];
    let linkCount = -1;
    for (let i = 0; i < lines.length; ++i) {
      let line = lines[i].split(':');
      let key = line[0].trim();
      if (!['title', 'link', 'image', 'description'].includes(key)) continue;
      let value = line
        .splice(1)
        .join(':')
        .trim();
      if (key === 'title') {
        linkList.push({
          title: 'No title',
          image: '',
          link: '/',
          description: 'No description'
        });
        linkCount++;
      } else {
        if (linkCount < 0) continue;
      }
      linkList[linkCount][key] = value;
    }
    return JSON.stringify(linkList);
  }
  return '';
}

function normalizePort(val) {
  let port = parseInt(val, 10);
  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
}

function loadAboutContent(app) {
  Page.directlyLoadPage('about', about => {
    app.locals.about = about;
  });
}

module.exports = {
  titleToLink,
  getDate,
  md2html,
  updateConfig,
  convertContent,
  normalizePort,
  loadAboutContent
};
