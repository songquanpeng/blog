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
    Article.getAllArticlesIntroduction((error, articles) => {
        res.render('index', {
            articles: articles.reverse(),
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
        const commentSubmitPath = '/api/comment/article_'+req.params.id;
        // if (error) return next(error);
        if (error != null || article === undefined) {
            res.render('404');
        } else {
            article.content = markdown.toHTML(article.content);
            Data.getCommentBySubmitPath(commentSubmitPath, (error, comments) => {
                res.render('article', {
                    article: article,
                    commentSubmitPath: commentSubmitPath,
                    comments: comments.reverse(),
                });
            });
        }
    });


});


router.get('/user', function (req, res) {
    if (req.session.user === undefined) {
        res.render("login", {error: req.flash('error'), info: req.flash('info')});
    } else {
        Article.getAllArticlesIntroduction((error, articles) => {
            User.all((error, users) => {
                res.render('user', {
                    info: req.flash('info'),
                    error: req.flash('error'),
                    articles: articles.reverse(),
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


router.get('/file', checkLogin, function (req, res) {
    Data.getAllFiles((error, files) => {
        res.render('file', {
            info: req.flash('info'),
            error: req.flash('error'),
            files: files
        })
    });
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

router.get('/chat', checkLogin, function (req, res) {
    Data.getRecentChats((error, messages) => {
        res.render('chat', {
            info: req.flash('info'),
            error: req.flash('error'),
            messages: messages.reverse(),
        });
    });
});

module.exports = router;
