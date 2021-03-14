const lexer = require('marked').lexer;
const parser = require('marked').parser;
const sanitizeHtml = require('sanitize-html');
const PAGE_TYPES = require('./constant').PAGE_TYPES;
const Option = require('../models').Option;
const Page = require('../models').Page;

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

async function updateConfig(config) {
  let options = await Option.findAll();
  options.forEach(option => {
    config[option.key] = option.value;
  });
  config.title = config.motto + ' | ' + config.site_name;
}

let convertedContentCache = new Map();

function deleteCacheEntry(id) {
  convertedContentCache.delete(id);
}

function convertContent(page, refresh) {
  if (convertedContentCache.has(page.id) && !refresh) {
    return convertedContentCache.get(page.id);
  }
  let convertedContent = '';

  let lines = page.content.split('\n');
  let deleteCount = 0;
  for (let i = 1; i < lines.length; ++i) {
    let line = lines[i];
    if (line.startsWith('---')) {
      deleteCount = i + 1;
      break;
    }
  }
  lines.splice(0, deleteCount);

  if (page.type === PAGE_TYPES.ARTICLE || page.type === PAGE_TYPES.DISCUSS) {
    convertedContent = md2html(lines.join('\n'));
  } else if (page.type === PAGE_TYPES.LINKS) {
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
    convertedContent = JSON.stringify(linkList);
  }
  convertedContentCache.set(page.id, convertedContent);
  return convertedContent;
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
  convertContent,
  loadNoticeContent
};
