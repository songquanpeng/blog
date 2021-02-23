'use strict';
const express = require('express');
const router = express.Router();
const Option = require('../models/option').Option;
const checkLogin = require('../middlewares/auth').loginRequired;
const checkPermission = require('../middlewares/auth').adminRequired;
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

router.get('/shutdown', checkPermission, (req, res, next) => {
  res.json({
    status: true,
    message: 'Goodbye!'
  });
  process.exit();
});

router.get('/:name', checkPermission, (req, res, next) => {
  const name = req.params.name;
  Option.get(name, (status, message, option) => {
    res.json({ status, message, option });
  });
});

router.post('/', checkPermission, (req, res, next) => {
  const options = req.body;
  for (const [key, value] of Object.entries(options)) {
    if (req.app.locals.config[key] !== value) {
      let option = {
        name: key,
        value
      };
      Option.update(key, option, (status, message) => {
        if (!status) {
          console.error(message);
        }
      });
    }
  }
  // TODO: here we actually didn't check the status.
  let status = true;
  let message = 'ok';
  updateConfig(req.app.locals.config, () => {
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
