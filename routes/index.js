'use strict';
const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const Data = require('../models/data').Data;
const User = require('../models/user').User;
const markdown = require('markdown').markdown;
const LocalFile = require('../models/localFile').LocalFile;
const checkLogin = require('../middlewares/check').checkLogin;

/* GET home page. */
router.get('/', function (req, res) {
    Article.all((error, articles) => {
        res.render('index', {
            articles: articles,
            info: req.flash('info'),
            error: req.flash('error')
        });
    });
});

router.get('/bookmark', function (req, res) {
    Data.getAllBookmarks((error, bookmarks) => {
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
    if (req.session.user === undefined) {
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

router.get('/user/:name', function (req, res) {
    Article.getArticlesByAuthor(req.params.name, (error, articles) => {
        res.render('visit', {
            info: req.flash('info'),
            error: req.flash('error'),
            articles: articles
        });
    });
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

router.get('/post', checkLogin, function (req, res) {
    res.render("post");
});

router.get('/message_board', checkLogin, function (req, res) {
    const commentSubmitPath = '/api/comment/message_board';
    Data.getCommentBySubmitPath(commentSubmitPath, (error, comments) => {
        res.render('message_board', {
            info: req.flash('info'),
            error: req.flash('error'),
            commentSubmitPath: commentSubmitPath,
            comments: comments.reverse(),
        });
    });
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
