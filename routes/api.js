'use strict';
const express = require('express');
const router = express.Router();
const Article = require('../models/article').Article;
const User = require('../models/user').User;
const Data = require('../models/data').Data;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;
const checkLoginWithoutRedirect = require('../middlewares/check')
  .checkLoginWithoutRedirect;
const titleToLink = require('../util').titleToLink;

router.post('/login', function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  User.checkCredential(username, password, canLogin => {
    // res.send("OK\n" ? canLogin : "Wrong\n");
    if (canLogin) {
      req.session.user = {
        name: username
      };
      req.flash('info', 'Login Successfully');
      res.redirect('/user');
    } else {
      req.flash('error', 'Invalid credentials, please try again!');
      res.redirect('/user');
    }
  });
});

router.get('/article/:link', function(req, res) {
  Article.getArticleByLink(req.params.link, (error, article) => {
    if (error != null || article === undefined) {
      res.json();
    } else {
      res.json(article);
    }
  });
});

router.post('/post', checkLogin, function(req, res) {
  const currentTime = new Date();
  let title = req.body.title.trim();
  if (title === '') {
    title = currentTime.toLocaleString();
  }
  let tag = req.body.tag.trim();
  if (tag === '') {
    tag = 'others';
  }
  let description = req.body.description.trim();
  if (description === '') {
    description = req.body.content.slice(0, 20) + ' ...';
  }
  const link = titleToLink(req.body.title);
  let copyright =
    '\n\n---\n**未经本人允许，禁止一切形式的转载！**\n**原文链接：**https://iamazing.cn/article/' +
    link;
  Article.create(
    {
      title: title,
      author: req.session.user.name,
      tag: tag,
      time: currentTime.toLocaleString(),
      content: req.body.content + copyright,
      description: description,
      link: link
    },
    () => {
      req.flash('info', 'Article has been successfully uploaded');
      res.redirect('/');
    }
  );
});

router.delete('/article/:id', checkPermission, function(req, res) {
  Article.delete(req.params.id, () => {
    res.send('Successfully delete article.');
  });
});

router.delete('/user/:name', checkPermission, function(req, res) {
  User.delete(req.params.name, () => {
    res.send('Successfully delete user.');
  });
});

router.post('/addUser', checkPermission, function(req, res) {
  User.addUser(
    {
      username: req.body.username,
      password: req.body.password,
      level: 2
    },
    error => {
      if (error != null) {
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect('/user');
      } else {
        req.flash('info', 'Successfully added user.');
        res.redirect('/user');
      }
    }
  );
});

router.post('/updateUser', checkLogin, function(req, res) {
  const oldName = req.session.user.name;
  const newName = req.body.username.trim();
  const newPassword = req.body.password.trim();
  if (newName === '' || newPassword === '') {
    req.flash('error', 'Invalid tokens.');
    res.redirect('/user');
  }
  if (oldName === 'root' && oldName !== newName) {
    req.flash('error', 'Root user cannot change his name.');
    res.redirect('/user');
  } else {
    User.update(
      {
        oldName: oldName,
        newName: newName,
        newPassword: newPassword
      },
      error => {
        // Pass the error parameter to the callback function
        if (error != null) {
          req.flash('error', error.message);
          res.redirect('/user');
        } else {
          req.flash('info', 'Successfully update your information.');
          req.session.user.name = newName;
          res.redirect('/user');
        }
      }
    );
  }
});

router.post('/edit/:link', checkLogin, function(req, res) {
  const link = req.params.link;
  const username = req.session.user.name;
  Article.getArticleAuthorByLink(link, (error, data) => {
    if (error) {
      res.render('message');
    } else if (data.author !== username) {
      req.flash('error', 'Permission denied');
      res.redirect('/user');
    } else {
      let tag = req.body.tag.trim();
      if (tag === '') {
        tag = 'others';
      }
      let description = req.body.description.trim();
      if (description === '') {
        description = req.body.content.slice(0, 20) + ' ...';
      }
      //const currentTime = new Date();
      Article.updateArticleByLink(
        link,
        {
          title: req.body.title,
          author: username,
          tag: tag,
          // time: currentTime.toLocaleString(),
          content: req.body.content,
          description: description,
          link: titleToLink(req.body.title)
        },
        error => {
          if (error !== null) {
            req.flash('info', 'Article has been successfully updated.');
            res.redirect('/user');
          } else {
            req.flash('error', 'Unable to update!');
            res.redirect('/user');
          }
        }
      );
    }
  });
});

router.post('/comment/:subpath', checkLoginWithoutRedirect, function(req, res) {
  const currentTime = new Date();
  Data.createComment(
    {
      path: '/api/comment/' + req.params.subpath,
      time: currentTime.toLocaleString(),
      author: req.session.user.name,
      content: req.body.content
    },
    error => {
      if (error != null) {
        console.log(error.message);
        res.send('Sorry file upload failed');
      } else {
        res.send('Successful Comment');
      }
    }
  );
});

router.get('/logout', function(req, res) {
  if (req.session.user !== undefined) {
    req.session.user = undefined;
  }
  req.flash('info', 'Successfully logout!');
  res.redirect('/user');
});

router.get('/message', checkPermission, function(req, res) {
  Data.getActiveMessage((error, messages) => {
    if (error) {
      res.sendStatus(500);
    } else {
      res.json(messages);
    }
  });
});

router.delete('/deactivateMessage/:id', checkPermission, function(req, res) {
  Data.deactivateMessage(req.params.id, error => {
    if (error) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

router.post('/message', function(req, res) {
  let title = req.body.title;
  let content = req.body.content;
  let date = new Date();
  Data.createMessage(
    {
      title: title,
      content: content,
      time: date.toLocaleString()
    },
    error => {
      if (error) {
        req.flash('error', error.message);
        res.redirect('/');
      } else {
        res.redirect('/');
      }
    }
  );
});

module.exports = router;
