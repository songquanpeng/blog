'use strict';
const express = require('express');
const router = express.Router();
const Option = require('../models/option').Option;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;
const updateConfig = require('../utils/util').updateConfig;

router.get('/', checkLogin, (req, res, next) => {
  Option.all((status, message, options) => {
    res.json({ status, message, options });
  });
});

router.post('/search', checkPermission, function(req, res, next) {
  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';
  Page.search(keyword, (status, message, options) => {
    res.json({
      status,
      message,
      options
    });
  });
});

router.get('/:name', checkPermission, (req, res, next) => {
  const name = req.params.name;
  Option.get(name, (status, message, option) => {
    res.json({ status, message, option });
  });
});

router.post('/', checkPermission, (req, res, next) => {
  const name = req.body.name;
  const value = req.body.value;
  let option = {
    name,
    value
  };
  Option.update(name, option, (status, message) => {
    if (status) {
      updateConfig(req.app.locals.config);
    }
    res.json({ status, message });
  });
});

router.delete('/:name', checkLogin, (req, res, next) => {
  const name = req.params.name;
  Option.delete(name, (status, message) => {
    res.json({ status, message });
  });
});

module.exports = router;
