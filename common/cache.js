const { parseTagStr } = require('./util');
const { Page } = require('../models');
const { PAGE_STATUS, PAGE_TYPES } = require('./constant');
const { Op } = require('sequelize');
const { md2html } = require('./util');
const LRU = require('lru-cache');
const config = require('../config');

const options = {
  max: config.maxCachePosts,
  allowStale: true,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
};

let pages = undefined;
// Key is the page id, value the index of this page in array pages.
let id2index = new Map();
// Key is the page id, value is the converted content.
// let convertedContentCache = new Map();
const convertedContentCache = new LRU(options);
// Key is a tag name, value is an array of pages list ordered by their links.
let categoryCache = new Map();

function updateCache(page, isNew, updateConvertedContent) {
  // update converted content cache
  convertContent(page, updateConvertedContent);
  // Delete corresponding key in categoryCache
  let [category, _] = parseTagStr(page.tag);
  categoryCache.delete(category);

  if (isNew) {
    // Add new page to the front of pages.
    pages.unshift(page);
  } else {
    // Update pages.
    let i = id2index.get(page.id);
    if (i !== undefined) {
      pages.splice(i, 1);
      pages.unshift(page);
    }
  }
  // Update the index.
  // updateId2Index();
}

function deleteCacheEntry(id) {
  let index = id2index.get(id);
  if (index === undefined) return;
  // Delete corresponding key in categoryCache
  let [category, _] = parseTagStr(pages[index].tag);
  categoryCache.delete(category);

  // Clear converted content cache.
  convertedContentCache.delete(id);
  // Delete this page form pages array.
  pages.splice(index, 1);
}

function updateId2Index() {
  id2index.clear();
  for (let i = 0; i < pages.length; i++) {
    id2index.set(pages[i].id, i);
  }
}

function getLinks(id) {
  let i = id2index.get(id);
  if (i === undefined) {
    i = 0;
  }
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
      order: [
        ['pageStatus', 'DESC'],
        ['updatedAt', 'DESC']
      ],
      raw: true
    });
    updateId2Index();
  } catch (e) {
    console.log('Failed to load all pages!');
    console.error(e);
  }
}

async function getPageListByTag(tag) {
  // Check cache.
  if (categoryCache.has(tag)) {
    return categoryCache.get(tag);
  }

  // Retrieve from database.
  let list = [];
  try {
    list = await Page.findAll({
      where: {
        [Op.or]: [
          {
            tag: {
              [Op.like]: `${tag};%`
            }
          },
          {
            tag: {
              [Op.eq]: `${tag}`
            }
          }
        ],
        [Op.not]: [{ pageStatus: PAGE_STATUS.RECALLED }]
      },
      attributes: ['link', 'title'],
      order: [['link', 'ASC']],
      raw: true
    });
    // Save it to cache
    categoryCache.set(tag, list);
  } catch (e) {
    console.error('Failed to get pages list by tag!');
    console.error(e);
  }
  return list;
}

async function getPagesByRange(start, num) {
  if (pages === undefined) {
    // This means the server is just started.
    await loadAllPages();
  }
  if (num === -1) {
    return pages.slice(start);
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
  } else if (page.type === PAGE_TYPES.REDIRECT) {
    convertedContent = lines.join('\n').trim();
  } else if (page.type === PAGE_TYPES.TEXT) {
    convertedContent = lines.join('\n').trimStart();
  }
  convertedContentCache.set(page.id, convertedContent);
  return convertedContent;
}

function updateView(id) {
  let i = id2index.get(id);
  if (i === undefined) return;
  if (i >= 0 && i < pages.length) {
    pages[i].view++;
  }
}

module.exports = {
  getPagesByRange,
  convertContent,
  deleteCacheEntry,
  getLinks,
  updateCache,
  updateView,
  loadAllPages: loadAllPages,
  getPageListByTag
};
