const bannedMessage = 'You has been banned.';
const deniedMessage = 'Permission denied.';

exports.userRequired = (req, res, next) => {
  if (req.session.user) {
    if (req.session.user.isBlocked) {
      return res.render('message', {
        status: true,
        message: bannedMessage
      });
    }
  } else {
    return res.render('message', {
      status: false,
      message: 'This operation requires login.'
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
    return res.render('message', {
      status: true,
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
    return res.render('message', {
      status: true,
      message:
        req.session.user && req.session.user.isBlocked
          ? bannedMessage
          : deniedMessage
    });
  }
  next();
};
