'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const md2html = require('../utils/util').md2html;
const sitemap = require('sitemap');
const PAGE_TYPE = require('../utils/constant').PAGE_TYPE;

router.get('/', function(req, res, next) {
  Page.getByRange(0, 10, pages => {
    res.render('index', {
      pages: pages
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
  Page.getByLink(link, (success, message, page) => {
    if (success) {
      switch (page.type) {
        case PAGE_TYPE.ARTICLE:
          let content = page.content;
          let lines = content.split('\n');
          let deleteCount = 0;
          for (let i = 1; i < lines.length; ++i) {
            let line = lines[i];
            if (line.startsWith('---')) {
              deleteCount = i + 1;
              break;
            }
          }
          lines.splice(0, deleteCount);
          page.content = lines.join('\n');
          page.content = md2html(page.content);
          res.render('article', { page }); // TODO: other page types support
          break;
        case PAGE_TYPE.CODE:
          res.render('code', { page });
          break;
        case PAGE_TYPE.CUSTOMIZE:
          res.render('customize', { page });
          break;
        default:
          res.render('message', {
            title: 'Error!',
            message: `Unexpected page type: ${page.type}`
          });
      }
    } else {
      if (link === 'about') {
        message =
          'If you are the administrator, you should create a page with link "about".';
      }
      res.render('message', { title: 'Error!', message });
    }
  });
});

module.exports = router;
