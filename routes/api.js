const express = require('express');
const router = express.Router();


router.get('/', function (req, res) {
    res.send('req.query' + JSON.stringify(req.query));
});

router.get('/:first/:second', function (req, res) {
    res.send('req.params' + JSON.stringify(req.params))
});

module.exports = router;
