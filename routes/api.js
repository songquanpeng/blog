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
            req.flash("info", "Login Successfully");
            res.redirect('/');

        } else {
            req.flash("error", "Invalid credentials, please try again!");
            res.redirect('/login');
        }
    });
});


router.post('/post', function (req, res) {
    Article.create(
        {
            title: req.body.title,
            tag: req.body.tag,
            time: req.body.time,
            content: req.body.content,
            description: req.body.description
        },
        () => {
            req.flash("info", "Article has been successfully uploaded");
            res.redirect('/');
        }
    )
});

module.exports = router;
