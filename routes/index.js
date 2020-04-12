'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const md2html = require('../utils/util').md2html;
const Comment = require('../models/comment').Comment;
const sitemap = require('sitemap');
const PAGE_TYPE = require('../utils/constant').PAGE_TYPE;

router.get('/', function(req, res, next) {
  let start = 0;
  let end = 9;
  Page.getByRange(start, end, pages => {
    res.render('index', {
      pages: pages,
      prev: ``,
      next: `10-19`
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
  const host = 'https://' + req.app.locals.config.domain;
  let sitemapOption = {
    hostname: host,
    cacheTime: 600000,
    urls: [host]
  };
  Page.getByRange(0, 1000, pages => {
    pages.forEach(page => {
      sitemapOption.urls.push({
        url: `/page/` + page.link,
        changefreq: 'daily',
        lastmod: page.edit_time
      });
    });
    let xml = sitemap.createSitemap(sitemapOption).toString();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
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
            res.render('discuss', {page});
            break;
          default:
            res.render('message', {
              title: 'Error!',
              message: `Unexpected page type: ${page.type}`
            });
        }
      });
    } else {
      res.render('message', { title: 'Error!', message });
    }
  });
});

router.get('/pagination/:pagination', function(req, res, next) {
  let pagination = req.params.pagination;
  let start = 0;
  let end = 9;
  if (pagination !== undefined) {
    let temp = pagination.split('-');
    start = parseInt(temp[0]);
    end = parseInt(temp[1]);
    start = Math.max(0, start);
    end = Math.max(0, end);
  }
  if (start === 0) {
    res.redirect('/');
  }
  let number = Math.max(1, end - start + 1);
  let lastIndex = Math.max(0, start - number);
  let nextIndex = start + number;
  Page.getByRange(start, number, pages => {
    if (pages === undefined || pages.length === 0) {
      res.redirect('/');
    } else {
      res.render('index', {
        pages: pages,
        prev: `${lastIndex}-${lastIndex + number}`,
        next: `${nextIndex}-${nextIndex + number}`
      });
    }
  });
});

module.exports = router;
