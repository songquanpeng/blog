const { Page, User } = require('../models');
const { PAGE_STATUS, PAGE_TYPES } = require('./constant');
const sequelize = require('sequelize');
const { Op } = require('sequelize');
const { md2html } = require('./util');

let pages = undefined;
let convertedContentCache = new Map();

async function loadAllPages() {
  // The password & token of user shouldn't be load!
  try {
    pages = await Page.findAll({
      where: {
        [Op.or]: [
          { pageStatus: PAGE_STATUS.PUBLISHED },
          { pageStatus: PAGE_STATUS.TOPPED }
        ]
      },
      order: [sequelize.literal('"Page.updatedAt" DESC')],
      raw: true,
      include: User
    });
  } catch (e) {
    console.log('Failed to load all pages!');
    console.error(e);
  }
}

async function getPagesByRange(start, num) {
  if (pages === undefined) {
    await loadAllPages();
  }
  return pages.slice(start, start + num);
}

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

module.exports = {
  getPagesByRange,
  convertContent,
  deleteCacheEntry
};
