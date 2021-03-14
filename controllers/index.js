const { getPagesByRange } = require('../cache/page');
const { Page } = require('../models');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const { PAGE_STATUS, PAGE_TYPES } = require('../common/constant');
const { convertContent } = require('../common/util');
const { Op } = require('sequelize');

async function getIndex(req, res, next) {
  let page = parseInt(req.query.p);
  if (!page || page <= 0) {
    page = 0;
  }
  let pageSize = 10;
  let start = page * pageSize;
  let pages = await getPagesByRange(start, pageSize);
  res.render('index', {
    pages: pages,
    prev: `?p=${page - 1}`,
    next: `?p=${page + 1}`
  });
}

async function getArchive(req, res, next) {
  let pages = await getPagesByRange(0, 1000);
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
    let pages = await getPagesByRange(0, 1000);
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
  const month = req.params.month;
  const time = year + '-' + month;
  // TODO:
  let pages = await Page.findAll({
    where: {
      pageStatus: {
        $not: PAGE_STATUS.RECALLED
      },
      tag: {
        $like: `%${time}%`
      }
    }
  });
  res.render('list', { pages, title: time });
}

async function getTag(req, res, next) {
  const tag = req.params.tag;
  let pages = await Page.findAll({
    where: {
      pageStatus: {
        $not: PAGE_STATUS.RECALLED
      },
      tag: {
        $like: `%${tag}%`
      }
    }
  });
  res.render('list', { pages, title: tag });
}

async function getPage(req, res, next) {
  // TODO: update views
  const link = req.params.link;
  let page = await Page.findOne({
    where: {
      [Op.and]: [{ link }],
      [Op.not]: [{ pageStatus: PAGE_STATUS.RECALLED }]
    },
    raw: true
  });
  if (page === null) {
    return res.render('message', {
      title: 'Error!',
      message: `No page has link "${link}".`
    });
  }
  // TODO: get prev link and next link.
  let links = {
    prev: {
      title: 'Prev One',
      link: 'prev-one'
    },
    next: {
      title: 'Next One',
      link: 'next-one'
    }
  };
  page.view++;
  page.converted_content = convertContent(page, false);
  res.locals.links = links;
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
    default:
      res.render('message', {
        title: 'Error!',
        message: `Unexpected page type: ${page.type}`
      });
  }
}

module.exports = {
  getIndex,
  getArchive,
  getSitemap,
  getMonthArchive,
  getTag,
  getPage
};
