'use strict';
const express = require('express');
const router = express.Router();
const User = require('../models/user').User;
const axios = require('axios');

const checkLogin = require('../middlewares/auth').loginRequired;
const checkPermission = require('../middlewares/auth').adminRequired;

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
      if (req.app.locals.config.message_push_api) {
        let url = `${req.app.locals.config.message_push_api}A user with ip address ${req.ip} just logged in to your blog site.`;
        axios.get(url).then(() => {});
      }
    } else {
      res.json({
        status,
        message
      });
    }
  });
});

router.get('/logout', function(req, res, next) {
  req.session.user = undefined;
  res.json({
    status: true,
    message: 'Logout successfully.'
  });
});

router.get('/status', checkLogin, function(req, res, next) {
  res.json({
    status: true,
    user: req.session.user
  });
});

router.put('/', checkPermission, function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const display_name = req.body.display_name;
  const email = req.body.email;
  const url = req.body.url;
  const status = req.body.status;
  const avatar = req.body.avatar;

  console.log(req.body);
  if (!username.trim() || !password.trim()) {
    res.json({
      status: false,
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
        status,
        avatar
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

router.get('/', checkPermission, (req, res, next) => {
  User.all((status, message, users) => {
    res.json({ status, message, users });
  });
});

router.get('/:id', checkPermission, (req, res, next) => {
  const id = req.params.id;
  User.getById(id, (status, message, user) => {
    res.json({ status, message, user });
  });
});

router.post('/', checkPermission, (req, res, next) => {
  const id = req.body.id;
  let username = req.body.username;
  let password = req.body.password;
  let display_name = req.body.display_name;
  let status = req.body.status;
  let email = req.body.email;
  let url = req.body.url;
  const avatar = req.body.avatar;

  let user = {
    username,
    password,
    display_name,
    status,
    email,
    avatar,
    url
  };

  User.updateById(id, user, (status, message) => {
    res.json({ status, message });
  });
});

router.delete('/:id', checkPermission, (req, res, next) => {
  const id = req.params.id;
  User.delete(id, (status, message) => {
    res.json({ status, message });
  });
});

module.exports = router;
