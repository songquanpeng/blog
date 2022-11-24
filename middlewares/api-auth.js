const bannedMessage = '用户已被封禁';
const deniedMessage = '访问被拒绝';

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
