'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;
const lexer = require('marked').lexer;
const parser = require('marked').parser;
const sanitizeHtml = require('sanitize-html');

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
      res.render('article', { page }); // TODO: other page types support
    } else {
      res.render('error', { message });
    }
  });
});
module.exports = router;
