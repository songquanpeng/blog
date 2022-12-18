const { updateView } = require('../common/cache');
const { getLinks } = require('../common/cache');
const { getDate } = require('../common/util');
const { getPagesByRange } = require('../common/cache');
const { Page } = require('../models');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const { PAGE_STATUS, PAGE_TYPES } = require('../common/constant');
const { convertContent } = require('../common/cache');
const { Op } = require('sequelize');
const path = require('path');
const config = require('../config');
const { parseTagStr } = require('../common/util');
const { getPageListByTag } = require('../common/cache');

async function getIndex(req, res, next) {
  if (req.url === '/' && req.app.locals.config.index_page_content !== '') {
    if (req.app.locals.config.index_page_content === '404') {
      res.status(404);
      res.end();
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(req.app.locals.config.index_page_content);
    }
    return;
  }
  let page = parseInt(req.query.p);
  if (!page || page <= 0) {
    page = 0;
  }
  let pageSize = 10;
  let start = page * pageSize;
  let pages = await getPagesByRange(start, pageSize);
  if (page !== 0 && pages.length === 0) {
    res.redirect('/');
  } else {
    res.render('index', {
      pages: pages,
      prev: `?p=${page - 1}`,
      next: `?p=${page + 1}`
    });
  }
}

async function getArchive(req, res, next) {
  let pages = await getPagesByRange(0, -1);
  res.render('archive', {
    pages: pages.reverse()
  });
}

async function getSitemap(req, res, next) {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');

  if (req.app.locals.sitemap) {
    res.send(req.app.locals.sitemap);
    return;
  }
  try {
    const hostname = 'https://' + req.app.locals.config.domain;
    const smStream = new SitemapStream({ hostname });
    const pipeline = smStream.pipe(createGzip());
    let pages = await getPagesByRange(0, -1);
    pages.forEach(page => {
      smStream.write({ url: `/page/` + page.link });
    });
    streamToPromise(pipeline).then(sm => (req.app.locals.sitemap = sm));
    smStream.end();
    pipeline.pipe(res).on('error', e => {
      throw e;
    });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}

async function getMonthArchive(req, res, next) {
  const year = req.params.year;
  let month = req.params.month;
  const time = year + '-' + month;
  let startDate = new Date(year, parseInt(month) - 1, 1, 0, 0, 0, 0);
  let endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 1);
  try {
    let pages = await Page.findAll({
      where: {
        pageStatus: {
          [Op.not]: PAGE_STATUS.RECALLED
        },
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      raw: true
    });
    res.render('list', { pages, title: time });
  } catch (e) {
    res.render('message', {
      title: '错误',
      message: e.message
    });
  }
}

async function getTag(req, res, next) {
  const tag = req.params.tag;
  try {
    let pages = await Page.findAll({
      where: {
        pageStatus: {
          [Op.not]: PAGE_STATUS.RECALLED
        },
        tag: {
          [Op.like]: `%${tag}%`
        }
      },
      raw: true
    });
    res.render('list', { pages, title: tag });
  } catch (e) {
    res.render('message', {
      title: '错误',
      message: e.message
    });
  }
}

async function getPage(req, res, next) {
  const link = req.params.link;
  let page = await Page.findOne({
    where: {
      [Op.and]: [{ link }],
      [Op.not]: [{ pageStatus: PAGE_STATUS.RECALLED }]
    }
  });
  if (page === null) {
    return res.render('message', {
      title: '错误',
      message: `未找到链接为 ${link} 且公共可见的页面`
    });
  }
  // Update views
  page.increment('view').then();
  page = page.get({ plain: true });
  // Change the data format.
  page.createdAt = getDate('default', page.createdAt);
  page.updatedAt = getDate('default', page.updatedAt);

  page.view++;
  updateView(page.id);
  if (page.password) {
    page.converted_content = '<p>本篇文章被密码保护，需要输入密码才能查看，但是正在使用的主题不支持该功能！</p>';
  } else {
    page.converted_content = convertContent(page, false);
  }
  // Category
  let [category, tags] = parseTagStr(page.tag);
  page.tags = tags;
  if (category && category !== 'Others') {
    page.category = category;
    page.categoryList = await getPageListByTag(page.category);
  } else {
    page.categoryList = [];
  }

  res.locals.links = getLinks(page.id);
  switch (page.type) {
    case PAGE_TYPES.ARTICLE:
      res.render('article', { page });
      break;
    case PAGE_TYPES.CODE:
      res.render('code', { page });
      break;
    case PAGE_TYPES.RAW:
      res.render('raw', { page });
      break;
    case PAGE_TYPES.DISCUSS:
      res.render('discuss', { page });
      break;
    case PAGE_TYPES.LINKS:
      let linkList;
      try {
        linkList = JSON.parse(page.converted_content);
      } catch (e) {
        console.error(e.message);
      }
      res.render('links', { page, linkList });
      break;
    case PAGE_TYPES.REDIRECT:
      res.redirect(page.converted_content);
      break;
    case PAGE_TYPES.TEXT:
      let type = 'text/plain';
      if (page.link.endsWith('.html')) {
        type = 'text/html';
      } else if (page.link.endsWith('.json')) {
        type = 'application/json';
      }
      res.set('Content-Type', type);
      res.send(page.converted_content);
      break;
    default:
      res.render('message', {
        title: '错误',
        message: `意料之外的页面类型：${page.type}`
      });
  }
}

async function getStaticFile(req, res, next) {
  let filePath = req.path;
  if (filePath) {
    res.set('Cache-control', `public, max-age=${config.cacheMaxAge}`);
    return res.sendFile(
      path.join(
        __dirname,
        `../themes/${req.app.locals.config.theme}/${filePath}`
      )
    );
  }
  res.sendStatus(404);
}

module.exports = {
  getIndex,
  getArchive,
  getSitemap,
  getMonthArchive,
  getTag,
  getPage,
  getStaticFile
};
