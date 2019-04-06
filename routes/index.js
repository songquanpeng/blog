'use strict';
const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const Bookmark = require('../models/bookmark').Bookmark;
const User = require('../models/user').User;
const markdown = require('markdown').markdown;
const LocalFile = require('../models/localFile').LocalFile;

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
        if (error != null || article === undefined) {
            res.render('404');
        } else {
            article.content = markdown.toHTML(article.content);
            res.render('article', {
                article: article
            });
        }
    });
});


router.get('/user', function (req, res) {
    if (req.session.user == null) {
        res.render("login", {error: req.flash('error'), info: req.flash('info')});
    } else {
        Article.all((error, articles) => {
            User.all((error, users) => {
                res.render('user', {
                    info: req.flash('info'),
                    error: req.flash('error'),
                    articles: articles,
                    users: users
                });
            });
        });
    }
});

router.get('/file', function (req, res) {
    res.render('file', {
        info: req.flash('info'),
        error: req.flash('error'),
    })
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

router.get('/image', function (req, res) {
    LocalFile.loadAllImages((images) => {
        res.render("image", {
            "info": "",
            "error": "",
            images: images
        });
    });
});

router.get('/video', function (req, res) {
    LocalFile.loadAllVideos((videos) => {
        res.render("video", {
            "info": "",
            "error": "",
            videos: videos,
        });
    });
});

module.exports = router;
