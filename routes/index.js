const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const Bookmark = require('../models/bookmark').Bookmark;
const User = require('../models/user').User;


/* GET home page. */
router.get('/', function (req, res) {
    Article.all((error, articles) => {
        // if (error) return next(error);
        res.render('index', {
            articles: articles,
            info: req.flash('info'),
            error: req.flash('error')
        });
    });
});

router.get('/bookmark', function (req, res) {
    Bookmark.all((error, bookmarks) => {
        // if (error) return next(error);
        res.render('bookmark', {
            bookmarks: bookmarks
        });
    });
});

router.get('/article/:id', function (req, res) {
    Article.find(req.params.id, (error, article) => {
        // if (error) return next(error);
        res.render('article', {
            article: article
        });
    });
});


router.get('/user', function (req, res) {
    if (req.session.user == null) {
        res.render("login", {error: req.flash('error'), info: req.flash('info')});
    } else {
        Article.all((error, articles) => {
            User.all((error, users) => {
                res.render('user', {
                    "info": "",
                    "error": "",
                    articles: articles,
                    users: users
                });
            });
        });
    }
});


router.get('/about', function (req, res) {
    res.render("about");
});

router.get('/archive', function (req, res) {
    res.render("archive");
});

router.get('/post', function (req, res) {
    res.render("post");
});

module.exports = router;
