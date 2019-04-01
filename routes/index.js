const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;

/* GET home page. */
router.get('/', function (req, res) {
    res.render('article', {
        topArticles: [{'link': 'http://justsong.xyz', "title": "Example A"}, {
            'link': 'http://justsong.xyz',
            "title": "Example B"
        }],
        title: "title here",
        tag: "tag here",
        time: "time here",
        content: "content here content here",
    });

});


router.get('/article/:id', function (req, res) {
    console.log("id: " + req.params.id);
    Article.find(req.params.id, (error, article) => {
        // if (error) return next(error);
        res.render('article', {
            topArticles: [{'link': 'http://justsong.xyz', "title": "Example A"}, {
                'link': 'http://justsong.xyz',
                "title": "Example B"
            }],
            title: article.title,
            tag: article.tag,
            time: article.time,
            content: article.content,
        });
    });
});


router.get('/login', function (req, res) {
    res.render("login", {});
});


module.exports = router;
