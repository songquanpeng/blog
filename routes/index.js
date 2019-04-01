const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;


/* GET home page. */
router.get('/', function (req, res) {
    Article.all((error, articles) => {
        // if (error) return next(error);
        res.render('articleList', {
            topArticles: [{'link': 'http://justsong.xyz', "title": "Example A"}, {
                'link': 'http://justsong.xyz',
                "title": "Example B"
            }],
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
    res.render("login", {});
});


module.exports = router;
