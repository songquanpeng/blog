'use strict';
const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const User = require('../models/user').User;
const multer = require('multer');

const uploadPath = "D:\\Project\\Web\\www\\public\\upload";
const storage = multer.diskStorage({
    destination: uploadPath,
    filename: function (req, file, cb) {
        cb(null, Date.now()+'_'+file.originalname);
    }
});
const upload = multer({storage: storage});

router.post('/login', function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.checkCredential(username, password, (canLogin) => {
        // res.send("OK\n" ? canLogin : "Wrong\n");
        if (canLogin) {
            req.session.user = {
                name: username
            };
            req.flash("info", "Login Successfully");
            res.redirect('/user');
        } else {
            req.flash("error", "Invalid credentials, please try again!");
            res.redirect('/user');
        }
    });
});


router.post('/post', function (req, res) {
    const currentTime = new Date();
    Article.create(
        {
            title: req.body.title,
            tag: req.body.tag,
            time: currentTime.toLocaleString(),
            content: req.body.content,
            description: req.body.description
        },
        () => {
            req.flash("info", "Article has been successfully uploaded");
            res.redirect('/');
        }
    )
});

router.delete('/article/:id', function (req, res) {
    Article.delete(req.params.id, () => {
        res.send("Successfully deleted article.");
    })
});

router.delete('/user/:name', function (req, res) {
    User.delete(req.params.name, () => {
        res.send("Successfully deleted user.");
    })
});

router.post('/update_user', function (req, res) {
    const oldName = req.session.user.name;
    const newName = req.body.name.trim();
    const newPassword = req.body.password.trim();
    if (newName === "" || newPassword === "") {
        res.send("Invalid tokens.");
    }
    User.update(oldName, newName, newPassword, (error) => {  // Pass the error parameter to the callback function
        if (error != null) {
            console.log(error.message);
            res.send("Sorry, something went wrong.");
        } else {
            res.send("Successfully update your information.");
        }
    })
});

router.post('/upload', upload.single("test"), function (req, res) {
    req.flash("info", "Successful upload");
    res.redirect('/file');

});

module.exports = router;
