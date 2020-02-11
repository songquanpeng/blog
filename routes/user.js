'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/user').User;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;

router.post('/login', function(req, res) {
  let username = req.body.username;
  let password = req.body.password;
  if (username) username = username.trim();
  if (password) password = password.trim();
  if (username === '' || password === '') {
    res.json({ status: false, message: 'Invalid parameter.' });
    return;
  }
  User.check(username, password, (status, message, user) => {
    if (status) {
      req.session.user = user;
      res.json({
        status,
        message: message,
        user: user
      });
    } else {
      res.json({
        status,
        message
      });
    }
  });
});

router.post('/register', checkPermission, function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const display_name = req.body.display_name;
  const email = req.body.email;
  const url = req.body.url;
  if (!username.trim() || !password.trim()) {
    res.json({
      status: 2,
      message: 'Invalid parameter: username or password.'
    });
  } else {
    User.register(
      {
        username,
        password,
        display_name,
        email,
        url,
        status: 1
      },
      (success, message) => {
        res.json({
          status: success,
          message
        });
      }
    );
  }
});

router.get('/logout', function(req, res, next) {
  req.session.user = undefined;
  res.json({
    status: true,
    message: 'Logout successfully.'
  });
});

router.get('/status', function(req, res, next) {
  res.json({
    status: true,
    user: req.session.user
  });
});

module.exports = router;
