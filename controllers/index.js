const { getPagesByRange } = require('../cache/page');
const { Page } = require('../models');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const PAGE_STATUS = require('../common/constant').PAGE_STATUS;

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
      status: {
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
      status: {
        $not: PAGE_STATUS.RECALLED
      },
      tag: {
        $like: `%${tag}%`
      }
    }
  });
  res.render('list', { pages, title: tag });
}

async function getPage(req, res, next) {}

module.exports = {
  getIndex,
  getArchive,
  getSitemap,
  getMonthArchive,
  getTag,
  getPage
};
