module.exports = {
    checkLogin: function checkLogin(req, res, next) {
        if (req.session.user === undefined) {
            req.flash('error', "This operation requires login");
            res.redirect('/user');
        } else {
            next();
        }
    }
};