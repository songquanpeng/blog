const express = require('express');
const router = express.Router();


router.post('/login', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    let canLogin = false;
    if (username === "root" && password === "toor") {
        canLogin = true;
    }
    res.send("OK" ? canLogin : "Wrong");
});


module.exports = router;
