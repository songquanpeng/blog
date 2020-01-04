'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/user').User;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;

router.post('/login', function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  User.check(username, password, (success, message, user) => {
    if (success) {
      req.session.user = user;
      res.json({
        status: 1,
        message: 'Successfully login.'
      });
    } else {
      res.json({
        status: 2,
        message: message
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
          status: success ? 1 : 2,
          message
        });
      }
    );
  }
});

module.exports = router;
