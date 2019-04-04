const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const User = require('../models/user').User;


router.post('/login', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.checkCredential(username, password, (canLogin) => {
        // res.send("OK\n" ? canLogin : "Wrong\n");
        if (canLogin) {
            req.session.user = {
                name: username
            };
            res.redirect('/');

        } else {
            req.flash("info", "Invalid credentials, please try again!");
            res.redirect('/login');
        }
    });
});


router.post('/article', function (req, res) {
    Article.create(
        {title: req.body.title, tag: req.body.tag, time: req.body.time, content: req.body.content},
        () => {
            res.send('OK\n');
        }
    )
});

module.exports = router;
