const { Op } = require('sequelize');
const { User } = require('../models');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { hashPasswordWithSalt, checkPassword } = require('../common/util');

async function login(req, res) {
  let username = req.body.username;
  let password = req.body.password;
  if (username) username = username.trim();
  if (password) password = password.trim();
  if (username === '' || password === '') {
    return res.json({ status: false, message: '无效的参数' });
  }

  let user = await User.findOne({
    where: {
      [Op.and]: [{ username }]
    },
    raw: true
  });
  if (user && checkPassword(password, user.password)) {
    if (!user.isBlocked) {
      req.session.user = user;
      res.json({
        status: true,
        message: 'ok',
        user: user
      });
      if (req.app.locals.config.message_push_api) {
        let url = `${req.app.locals.config.message_push_api}IP 地址为 ${req.ip} 的用户刚刚登录了你的博客网站`;
        axios.get(url).then(() => {});
      }
    } else {
      res.json({
        status: false,
        message: '用户已被封禁'
      });
    }
  } else {
    res.json({
      status: false,
      message: '无效的凭证'
    });
  }
}

async function logout(req, res) {
  req.session.user = undefined;
  res.json({
    status: true,
    message: '注销成功'
  });
}

async function status(req, res) {
  res.json({
    status: true,
    user: req.session.user
  });
}

async function refreshToken(req, res) {
  let uuid = uuidv4();
  let userId = req.session.user.id;
  let user = await User.findOne({
    where: {
      id: userId
    }
  })
  if (user) {
    await user.update({
      accessToken: uuid
    });
    res.json({
      status: true,
      message: 'ok',
      accessToken: uuid
    });
  } else {
    res.json({
      status: false,
      message: '用户不存在'
    });
  }
}

async function update(req, res) {
  const id = req.body.id;
  let username = req.body.username;
  let password = req.body.password;
  let displayName = req.body.displayName;
  let isAdmin = req.body.isAdmin;
  let isModerator = req.body.isModerator;
  let isBlocked = req.body.isBlocked;
  let email = req.body.email;
  let url = req.body.url;
  const avatar = req.body.avatar;

  let newUser = {
    username,
    displayName,
    isAdmin,
    isModerator,
    isBlocked,
    email,
    avatar,
    url
  };

  let message = 'ok';
  let status = false;
  try {
    let user = await User.findOne({
      where: {
        id
      }
    });
    if (user) {
      if (password) {
        newUser.password = hashPasswordWithSalt(password);
      }
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
      attributes: { exclude: ['password'] },
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
    users = await User.findAll({
      attributes: { exclude: ['password'] },
      raw: true
    });
  } catch (e) {
    status = false;
    message = e.message;
  }
  res.json({ status, message, users });
}

async function create(req, res) {
  const username = req.body.username;
  let password = req.body.password;
  let displayName = req.body.displayName;
  if (!displayName) {
    displayName = username;
  }
  const email = req.body.email;
  const url = req.body.url;
  let isAdmin = req.body.isAdmin;
  let isModerator = req.body.isModerator;
  let isBlocked = req.body.isBlocked;
  const avatar = req.body.avatar;

  if (!username.trim() || !password.trim()) {
    return res.json({
      status: false,
      message: '无效的参数'
    });
  }
  password = hashPasswordWithSalt(password);
  let message = 'ok';
  let user = undefined;
  try {
    user = await User.create({
      username,
      password,
      displayName,
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
  refreshToken,
  update,
  get,
  getAll,
  create,
  delete_
};
