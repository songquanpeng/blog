'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;
const getDate = require('../utils/util').getDate;
const convertContent = require('../utils/util').convertContent;
const Stream = require('stream');

router.post('/search', checkPermission, function(req, res, next) {
  const type = Number(req.body.type);
  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';
  Page.search(keyword, type, (status, message, pages) => {
    res.json({
      status,
      message,
      pages
    });
  });
});

// Add page
router.post('/', checkLogin, (req, res, next) => {
  let type = req.body.type;
  let link = req.body.link;
  let page_status = req.body.page_status;
  let comment_status = req.body.comment_status;
  let title = req.body.title;
  let content = req.body.content;
  let tag = req.body.tag;
  let description = req.body.description;
  let password = req.body.password;
  let user_id = req.session.user.id;
  let post_time = getDate();
  let edit_time = post_time;
  let view = 0;
  let up_vote = 0;
  let down_vote = 0;
  let page = {
    user_id,
    type,
    link,
    page_status,
    post_time,
    edit_time,
    comment_status,
    title,
    content,
    tag,
    description,
    password,
    view,
    up_vote,
    down_vote
  };
  page.converted_content = convertContent(page.type, page.content);
  Page.add(page, (status, message, id) => {
    res.json({ status, message, id });
  });
});

router.get('/', checkLogin, (req, res, next) => {
  Page.all((status, message, pages) => {
    res.json({ status, message, pages });
  });
});

router.get('/export/:id', checkLogin, function(req, res, next) {
  const id = req.params.id;
  Page.getById(id, (status, message, page) => {
    if (status) {
      const filename = page.link + '.md';
      res.setHeader(
        'Content-disposition',
        "attachment; filename*=UTF-8''" + encodeURIComponent(filename)
      );
      res.setHeader('Content-type', 'text/md');
      const fileStream = new Stream.Readable({
        read(size) {
          return true;
        }
      });
      fileStream.pipe(res);
      fileStream.push(page.content);
      res.end();
    } else {
      next();
    }
  });
});

router.get('/:id', checkLogin, (req, res, next) => {
  const id = req.params.id;
  Page.getById(id, (status, message, page) => {
    res.json({ status, message, page });
  });
});

// Update page
router.put('/', checkLogin, (req, res, next) => {
  const id = req.body.id;
  let type = req.body.type;
  let link = req.body.link;
  let page_status = req.body.page_status;
  let comment_status = req.body.comment_status;
  let title = req.body.title;
  let content = req.body.content;
  let tag = req.body.tag;
  let description = req.body.description;
  let password = req.body.password;
  let edit_time = getDate();

  let page = {
    type,
    link,
    page_status,
    edit_time,
    comment_status,
    title,
    content,
    tag,
    password,
    description
  };
  page.converted_content = convertContent(page.type, page.content);

  Page.updateById(id, page, (status, message) => {
    res.json({ status, message });
  });
});

router.delete('/:id', checkLogin, (req, res, next) => {
  const id = req.params.id;
  Page.delete(id, (status, message) => {
    res.json({ status, message });
  });
});
module.exports = router;
