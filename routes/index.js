'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const md2html = require('../utils/util').md2html;
const Comment = require('../models/comment').Comment;
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const PAGE_TYPE = require('../utils/constant').PAGE_TYPE;

router.get('/', function(req, res, next) {
  let page = parseInt(req.query.p);
  if (!page || page <= 0) {
    page = 0;
  }
  let pageSize = 10;
  let start = page * pageSize;
  let end = start + pageSize;
  Page.getByRange(start, end, pages => {
    res.render('index', {
      pages: pages,
      prev: `?p=${page - 1}`,
      next: `?p=${page + 1}`
    });
  });
});

router.get('/archive', function(req, res) {
  Page.getByRange(0, 1000, pages => {
    res.render('archive', {
      pages: pages.reverse()
    });
  });
});

router.get('/sitemap.xml', function(req, res) {
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
    Page.getByRange(0, 1000, pages => {
      pages.forEach(page => {
        smStream.write({ url: `/page/` + page.link });
      });
      streamToPromise(pipeline).then(sm => (req.app.locals.sitemap = sm));
      smStream.end();
      pipeline.pipe(res).on('error', e => {
        throw e;
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

router.get('/archive/:year/:month', function(req, res) {
  const year = req.params.year;
  const month = req.params.month;
  const time = year + '-' + month;
  Page.getByTime(time, (status, message, pages) => {
    res.render('list', { pages, title: time });
  });
});

router.get('/tag/:tag', function(req, res) {
  const tag = req.params.tag;
  Page.getByTag(tag, (status, message, pages) => {
    res.render('list', { pages, title: tag });
  });
});

router.get('/page/:link', function(req, res, next) {
  const link = req.params.link;
  Page.getByLink(link, (success, message, page, links) => {
    if (success && page !== undefined) {
      page.view++;
      Comment.getByPageId(page.id, (status, message, comments) => {
        res.locals.comments = comments;
        res.locals.links = links;
        switch (page.type) {
          case PAGE_TYPE.ARTICLE:
            res.render('article', { page });
            break;
          case PAGE_TYPE.CODE:
            res.render('code', { page });
            break;
          case PAGE_TYPE.RAW:
            res.render('raw', { page });
            break;
          case PAGE_TYPE.DISCUSS:
            res.render('discuss', { page });
            break;
          case PAGE_TYPE.LINKS:
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
      });
      Page.updateViewCounter(page.id);
    } else {
      res.render('message', { title: 'Error!', message });
    }
  });
});

module.exports = router;
