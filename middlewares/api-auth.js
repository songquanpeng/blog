const bannedMessage = 'You has been banned.';
const deniedMessage = 'Permission denied.';

exports.userRequired = (req, res, next) => {
  if (!req.session.user) {
    return res.json({
      status: false,
      message: 'This operation requires login.'
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
