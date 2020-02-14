'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const md2html = require('../utils/util').md2html;
const PAGE_TYPE = require('../utils/constant').PAGE_TYPE;

router.get('/', function(req, res, next) {
  Page.getByRange(0, 10, pages => {
    res.render('index', {
      pages: pages
    });
  });
});

router.get('/page/:link', function(req, res, next) {
  Page.getByLink(req.params.link, (success, message, page) => {
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
      res.render('message', { title: 'Error!', message });
    }
  });
});
module.exports = router;
