const express = require('express');
const router = express.Router();

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
    })

});

router.get('/login', function (req, res) {
    res.render("login", {});
});


module.exports = router;
