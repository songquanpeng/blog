module.exports = {
  loginRequired: function checkLogin(req, res, next) {
    if (req.session.user === undefined) {
      res.json({
        status: false,
        message: 'This operation requires login.'
      });
    } else {
      next();
    }
  },

  adminRequired: function(req, res, next) {
    if (req.session.user === undefined) {
      res.json({
        status: false,
        message: 'This operation requires login.'
      });
    } else {
      if (req.session.user.status >= 10) {
        next();
      } else {
        res.json({
          status: false,
          message: 'Permission denied.'
        });
      }
    }
  }
};
