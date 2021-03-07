exports.userRequired = (req, res, next) => {
  if (req.session.user) {
    if (req.session.user.isBlocked) {
      return res.render('message', {
        isError: true,
        message: 'This operation requires login.',
        link: '/feedback'
      });
    }
  } else {
    return res.render('message', {
      isError: false,
      message: 'This operation requires login.',
      link: '/login'
    });
  }
  next();
};

exports.modRequired = (req, res, next) => {
  if (!req.session.user || !req.session.user.isModerator) {
    return res.render('message', {
      isError: true,
      message: 'Permission denied.'
    });
  }
  next();
};

exports.adminRequired = (req, res, next) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.render('message', {
      isError: true,
      message: 'Permission denied.'
    });
  }
  next();
};
