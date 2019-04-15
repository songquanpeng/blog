const User = require('../models/user').User;

module.exports = {
    checkLogin: function checkLogin(req, res, next) {
        if (req.session.user === undefined) {
            req.flash('error', "This operation requires login");
            res.redirect('/user');
        } else {
            next();
        }
    },
    checkLoginWithoutRedirect: function checkLoginWithoutRedirect(req, res, next) {
        if (req.session.user === undefined) {
            req.flash('error', "This operation requires login");
            res.sendStatus(403);
        } else {
            next();
        }
    },

    checkPermission: function (req, res, next) {
        if (req.session.user === undefined) {
            req.flash('error', "Permission denied");
            res.sendStatus(403);
        } else {
            User.getUserPermission(req.session.user.name, (error, operatorlevel) => {
                if (operatorlevel.level < 2) {
                    next();
                } else {
                    req.flash('error', "Permission denied");
                    res.sendStatus(403);
                }
            })
        }
    }
};