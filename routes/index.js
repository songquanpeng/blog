const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;


/* GET home page. */
router.get('/', function (req, res) {
    Article.all((error, articles) => {
        // if (error) return next(error);
        res.render('articleList', {
            articles: articles
        });
    });
});


router.get('/article/:id', function (req, res) {
    Article.find(req.params.id, (error, article) => {
        // if (error) return next(error);
        res.render('article', {
            topArticles: [{'link': 'http://justsong.xyz', "title": "Example A"}, {
                'link': 'http://justsong.xyz',
                "title": "Example B"
            }],
            article: article
        });
    });
});


router.get('/login', function (req, res) {
    res.render("login", {message:req.flash('info')});
});

router.get('/bookmark', function (req, res) {
    res.render("bookmark");
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
