const { User } = require('../models');
const { Op } = require('sequelize');
const bannedMessage = '用户已被封禁';
const deniedMessage = '访问被拒绝';

exports.tokenAuth = async (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  let accessToken = req.headers['Authorization'];
  if (!accessToken) {
    accessToken = req.headers['authorization'];
  }
  if (!accessToken) {
    return res.json({
      status: false,
      message: '令牌为空'
    });
  }
  try {
    let user = await User.findOne({
      where: {
        [Op.and]: [{ accessToken }]
      },
      attributes: ['id', 'username', 'isBlocked'],
      raw: true
    });
    if (!user) {
      return res.json({
        status: false,
        message: '无效的令牌'
      });
    }
    if (user.isBlocked) {
      return res.json({
        status: false,
        message: bannedMessage
      });
    }
    req.session.user = user;
    req.session.authWithToken = true;
    return next();
  } catch (e) {
    return res.json({
      status: false,
      message: e.message
    })
  }
}

exports.userRequired = (req, res, next) => {
  if (!req.session.user) {
    return res.json({
      status: false,
      message: '用户未登录，或登录状态已过期'
    });
  }
  if (req.session.user.isBlocked) {
    return res.json({
      status: false,
      message: bannedMessage
    });
  }
  next();
};

exports.modRequired = (req, res, next) => {
  if (
    !req.session.user ||
    req.session.user.isBlocked ||
    !req.session.user.isModerator
  ) {
    return res.json({
      status: false,
      message:
        req.session.user && req.session.user.isBlocked
          ? bannedMessage
          : deniedMessage
    });
  }
  next();
};

exports.adminRequired = (req, res, next) => {
  if (
    !req.session.user ||
    req.session.user.isBlocked ||
    !req.session.user.isAdmin
  ) {
    return res.json({
      status: false,
      message:
        req.session.user && req.session.user.isBlocked
          ? bannedMessage
          : deniedMessage
    });
  }
  next();
};
