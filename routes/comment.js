'use strict';
const express = require('express');
const router = express.Router();
const Comment = require('../models/comment').Comment;
const getDate = require('../utils/util').getDate;
const md2html = require('../utils/util').md2html;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;

router.put('/', (req, res, next) => {
  let id = req.body.id;
  let author = req.body.author;
  let page_id = req.body.page_id;
  let title = req.body.title;
  let content = req.body.content;
  let post_time = getDate();
  let up_vote = 0;
  let down_vote = 0;
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  let agent = req.get('User-Agent');
  let url = req.body.url;
  let email = req.body.email;
  let page = {
    id,
    author,
    title,
    content,
    post_time,
    up_vote,
    down_vote,
    ip,
    agent,
    url,
    email
  };
  Comment.add(page, (status, message) => {
    res.json({ status, message });
  });
});

// Notice this id is page's id, not comment's id.
router.get('/parsed/:id', (req, res, next) => {
  const id = req.params.id;
  Comment.getByPageId(id, (status, message, comments) => {
    res.json({ status, message, comments: md2html(comments) });
  });
});

// Notice this id is page's id, not comment's id.
router.get('/:id', checkPermission, (req, res, next) => {
  const id = req.params.id;
  Comment.getByPageId(id, (status, message, comments) => {
    res.json({ status, message, comments });
  });
});

// Notice this id is comment's id.
router.delete('/:id', checkPermission, (req, res, next) => {
  const id = req.params.id;
  Comment.deleteById(id, (status, message) => {
    res.json({ status, message });
  });
});

module.exports = router;
