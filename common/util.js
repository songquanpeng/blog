const { lexer, parser } = require('marked');
const fs = require('fs');

function titleToLink(title) {
  return title.trim().replace(/\s/g, '-');
}

function getDate(format, dateStr) {
  if (format === undefined || format === 'default')
    format = 'yyyy-MM-dd hh:mm:ss';
  let date;
  if (dateStr) {
    date = new Date(dateStr);
  } else {
    date = new Date();
  }
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

function parseTagStr(tag) {
  let tags = tag.split(';');
  let category = undefined;
  if (tags.length !== 0) {
    category = tags.shift();
  }
  return [category, tags];
}

async function fileExists(path) {
  return !!(await fs.promises.stat(path).catch(e => false));
}

module.exports = {
  titleToLink,
  parseTagStr,
  getDate,
  md2html,
  fileExists
};
