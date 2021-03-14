const { Page, User } = require('../models');
const { PAGE_STATUS, PAGE_TYPES } = require('./constant');
const sequelize = require('sequelize');
const { Op } = require('sequelize');
const { md2html } = require('./util');

let pages = undefined;
let id2index = new Map();
let convertedContentCache = new Map();

function updateCache(page, isNew, updateConvertedContent) {
  // update converted content cache
  convertContent(page, updateConvertedContent);

  if (isNew) {
    // Add new page to the front of pages.
    pages.unshift(page);
  } else {
    // Update pages.
    let i = id2index.get(page.id);
    pages.splice(i, 1);
    pages.unshift(page);
  }
  // Update the index.
  updateId2Index();
}

function deleteCacheEntry(id) {
  // Clear converted content cache.
  convertedContentCache.delete(id);
  // Delete this page form pages array.
  pages.splice(id2index.get(id), 1);
  // Update the index.
  updateId2Index();
}

function updateId2Index() {
  id2index.clear();
  for (let i = 0; i < pages.length; i++) {
    id2index.set(pages[i].id, i);
  }
}

function getLinks(id) {
  let i = id2index.get(id);
  let prevIndex = Math.max(i - 1, 0);
  let nextIndex = Math.min(i + 1, pages.length - 1);

  return {
    prev: {
      title: pages[prevIndex].title,
      link: pages[prevIndex].link
    },
    next: {
      title: pages[nextIndex].title,
      link: pages[nextIndex].link
    }
  };
}

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
    updateId2Index();
  }
  return pages.slice(start, start + num);
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
  deleteCacheEntry,
  getLinks,
  updateCache
};
