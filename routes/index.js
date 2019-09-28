'use strict';
const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const Data = require('../models/data').Data;
const User = require('../models/user').User;
const showdown = require('showdown');
const LocalFile = require('../models/localFile').LocalFile;
const checkLogin = require('../middlewares/check').checkLogin;
const converter = new showdown.Converter();

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

router.get('/article/:link', function (req, res) {
    Article.getArticleByLink(req.params.link, (error, article) => {
        const commentSubmitPath = '/api/comment/article-' + req.params.link;
        if (error != null || article === undefined) {
            res.render('404');
        } else {
            article.content = converter.makeHtml(article.content);
            Data.getCommentBySubmitPath(commentSubmitPath, (error, comments) => {
                res.render('article', {
                    article: article,
                    title: article.title,
                    keywords: article.tag,
                    description: article.description,
                    commentSubmitPath: commentSubmitPath,
                    comments: comments.reverse()
                });
            });
        }
    });
});

router.get('/edit/:link', function (req, res) {
    const link = req.params.link;
    const username = req.session.user.name;
    Article.getArticleAuthorByLink(link, (error, data) => {
        if (error) {
            res.render("error");
        } else if (data.author !== username) {
            req.flash('error', "Permission denied");
            res.redirect('/user');
        } else {
            Article.getArticleByLink(link, (error, article) => {
                if (error !== null || article === undefined) {
                    res.render('404');
                } else {
                    res.render('post', {
                        article: article
                    })
                }
            })
        }
    })
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
        res.render('list', {
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
    Article.getAboutPage((error, article) => {
        if (error != null || article === undefined) {
            res.render('404');
        } else {
            article.content = converter.makeHtml(article.content);
            res.render('about', {
                article: article,
                title: "About",
                keywords: "about 关于",
                description: "about this sites 关于本网站",
            });
        }
    });
});

router.get('/archive', function (req, res) {
    res.render("archive");
});

router.get('/post', checkLogin, function (req, res) {
    res.render("post", {
        article: undefined
    });
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

router.get('/tag/:tag', function (req, res) {
    Article.getArticlesByTag(req.params.tag, (error, articles) => {
        res.render('list', {
            info: req.flash('info'),
            error: req.flash('error'),
            articles: articles
        });
    });
});

module.exports = router;
