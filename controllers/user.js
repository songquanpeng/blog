const { Op } = require('sequelize');
const { User } = require('../models');
const axios = require('axios');

async function login(req, res) {
  let username = req.body.username;
  let password = req.body.password;
  if (username) username = username.trim();
  if (password) password = password.trim();
  if (username === '' || password === '') {
    return res.json({ status: false, message: 'Invalid parameter.' });
  }

  let user = await User.findOne({
    where: {
      [Op.and]: [{ username }, { password }]
    },
    raw: true
  });
  if (user) {
    if (!user.isBlocked) {
      req.session.user = user;
      res.json({
        status: true,
        message: 'ok',
        user: user
      });
      if (req.app.locals.config.message_push_api) {
        let url = `${req.app.locals.config.message_push_api}A user with ip address ${req.ip} just logged in to your blog site.`;
        axios.get(url).then(() => {});
      }
    } else {
      res.json({
        status: false,
        message: 'You have been banned.'
      });
    }
  } else {
    res.json({
      status: false,
      message: 'Invalid credentials.'
    });
  }
}

async function logout(req, res) {
  req.session.user = undefined;
  res.json({
    status: true,
    message: 'Logout successfully.'
  });
}

async function status(req, res) {
  res.json({
    status: true,
    user: req.session.user
  });
}

async function update(req, res) {
  const id = req.body.id;
  let username = req.body.username;
  let password = req.body.password;
  let display_name = req.body.display_name;
  let isAdmin = req.body.isAdmin;
  let isModerator = req.body.isModerator;
  let isBlocked = req.body.isBlocked;
  let email = req.body.email;
  let url = req.body.url;
  const avatar = req.body.avatar;

  let newUser = {
    username,
    password,
    display_name,
    isAdmin,
    isModerator,
    isBlocked,
    email,
    avatar,
    url
  };

  let message = 'ok';
  status = false;
  try {
    let user = await User.findOne({
      where: {
        id
      }
    });
    if (user) {
      await user.update(newUser);
    }
    status = user !== null;
  } catch (e) {
    message = e.message;
    console.error(e);
  }
  res.json({ status, message });
}

async function get(req, res) {
  const id = req.params.id;

  let user;
  let status = false;
  let message = 'ok';
  try {
    user = await User.findOne({
      where: {
        id
      },
      raw: true
    });
    status = user !== null;
  } catch (e) {
    message = e.message;
  }
  res.json({ status, message, user });
}

async function getAll(req, res) {
  let users = [];
  let message = 'ok';
  let status = true;
  try {
    users = await User.findAll({ raw: true });
  } catch (e) {
    status = false;
    message = e.message;
  }
  res.json({ status, message, users });
}

async function create(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const display_name = req.body.display_name;
  const email = req.body.email;
  const url = req.body.url;
  let isAdmin = req.body.isAdmin;
  let isModerator = req.body.isModerator;
  let isBlocked = req.body.isBlocked;
  const avatar = req.body.avatar;

  if (!username.trim() || !password.trim()) {
    return res.json({
      status: false,
      message: 'Invalid parameter: username or password.'
    });
  }
  let message = 'ok';
  let user = undefined;
  try {
    user = await User.create({
      username,
      password,
      display_name,
      email,
      url,
      isAdmin,
      isModerator,
      isBlocked,
      avatar
    });
  } catch (e) {
    message = e.message;
  }

  res.json({
    status: user !== undefined,
    message
  });
}

async function delete_(req, res) {
  const id = req.params.id;

  let status = false;
  let message = 'ok';
  try {
    let rows = await User.destroy({
      where: {
        id
      }
    });
    status = rows === 1;
  } catch (e) {
    message = e.message;
  }

  res.json({ status, message });
}

module.exports = {
  login,
  logout,
  status,
  update,
  get,
  getAll,
  create,
  delete_
};
