'use strict';
const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const User = require('../models/user').User;
const Data = require('../models/data').Data;
const multer = require('multer');
const checkLogin = require('../middlewares/check').checkLogin;
const uploadPath = "D:\\Project\\Web\\www\\public\\upload";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
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
            res.redirect('/');
        } else {
            req.flash("error", "Invalid credentials, please try again!");
            res.redirect('/user');
        }
    });
});


router.post('/post', checkLogin, function (req, res) {
    const currentTime = new Date();
    Article.create(
        {
            title: req.body.title,
            author: req.session.user.name,
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

router.post('/upload', upload.single("file"), function (req, res) {
    const currentTime = new Date();
    Data.uploadNewFile({
        name: req.file.filename,
        tag: req.body.tag,
        description: req.body.description,
        time: currentTime.toLocaleString()
    }, (error) => {
        if (error != null) {
            console.log(error.message);
            req.flash("error", "Sorry file upload failed");
        } else {
            req.flash("info", "Successful upload");
        }
        res.redirect('/file');
    });
});


router.post('/comment/:subpath', checkLogin, function (req, res) {
    const currentTime = new Date();
    Data.createComment({
        path: '/api/comment/' + req.params.subpath,
        time: currentTime.toLocaleString(),
        author: req.session.user.name,
        content: req.body.content,
    }, (error) => {
        if (error != null) {
            console.log(error.message);
            res.send("Sorry file upload failed");
        } else {
            res.send("Successful Comment");
        }
    });
});

module.exports = router;
