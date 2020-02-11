'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const md2html = require('../utils/util').md2html;

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
      page.content = page.content.replace(/^-(.*\s)*(-)+\s/, '');
      page.content = md2html(page.content);
      res.render('article', { page }); // TODO: other page types support
    } else {
      res.render('message', { title: 'Error!', message });
    }
  });
});
module.exports = router;
