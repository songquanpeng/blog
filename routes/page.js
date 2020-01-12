'use strict';
const express = require('express');
const router = express.Router();
const Page = require('../models/page').Page;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;

router.put('/', checkLogin, (req, res, next) => {
  let type = req.body.type;
  let link = req.body.link;
  let page_status = req.body.page_status;
  let comment_status = req.body.comment_status;
  let title = req.body.title;
  let content = req.body.content;
  let tag = req.body.tag;
  let password = req.body.password;

  let user_id = 0; //TODO
  let post_time = '2020-01-12'; //TODO
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
    password,
    view,
    up_vote,
    down_vote
  };
  Page.add(page, (status, message) => {
    res.json({ status, message });
  });
});
module.exports = router;
