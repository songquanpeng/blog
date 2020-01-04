const User = require('../models/user').User;

module.exports = {
  checkLogin: function checkLogin(req, res, next) {
    if (req.session.user === undefined) {
      res.json({
        status: 2,
        message: 'This operation requires login.'
      });
    } else {
      next();
    }
  },

  checkPermission: function(req, res, next) {
    if (req.session.user === undefined) {
      res.json({
        status: 2,
        message: 'This operation requires login.'
      });
    } else {
      if (req.session.user.status >= 10) {
        next();
      } else {
        res.json({
          status: 2,
          message: 'Permission denied.'
        });
      }
    }
  }
};
