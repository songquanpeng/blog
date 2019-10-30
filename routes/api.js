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
const titleToLink = require('../utils/util').titleToLink;
const lexer = require('marked').lexer;
const parser = require('marked').parser;
const sanitizeHtml = require('sanitize-html');

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

router.get('/statistics', function(req, res) {
  Data.getStatistics(14, (error, data) => {
    if (error) {
      console.error(error.message);
    } else {
      data = data.sort(function(a, b) {
        return a.id > b.id;
      });
    }
    res.json(data);
  });
});

router.get('/page/:pageName', function(req, res) {
  Article.getSpecialPage(
    req.params.pageName.toLowerCase(),
    (error, article) => {
      if (error != null || article === undefined) {
        res.json(undefined);
      } else {
        article.content = parser(
          lexer(
            article.content
              .split('\n')
              .splice(3)
              .join('\n')
          )
        );
        res.json(article);
      }
    }
  );
});

router.get('/article/:link', checkLogin, function(req, res) {
  Article.getArticleByLink(req.params.link, (error, article) => {
    if (error != null || article === undefined) {
      res.json();
    } else {
      res.json(article);
    }
  });
});

router.get('/article/:start/:number', function(req, res) {
  const start = parseInt(req.params.start);
  const number = parseInt(req.params.number);
  Article.getArticlesByRange(start, number, articles => {
    res.json({
      currentUser: req.session.user ? req.session.user.name : undefined,
      articles: articles
    });
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
  Article.create(
    {
      title: title,
      author: req.session.user.name,
      tag: tag,
      time: currentTime.toLocaleString(),
      content: req.body.content,
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
      const currentTime = new Date();
      Article.updateArticleByLink(
        link,
        {
          title: req.body.title,
          author: username,
          tag: tag,
          time: currentTime.toLocaleString(),
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

router.get('/comment/:articleId', function(req, res) {
  const articleId = req.params.articleId;
  let isAdmin = false;
  if (req.session.user && req.session.user.name === 'root') {
    isAdmin = true;
  }
  Data.getCommentsByArticleId(articleId, comments => {
    res.json({
      isAdmin: isAdmin,
      comments: comments
    });
  });
});

router.post('/setCommentState', checkPermission, function(req, res) {
  const commentId = req.body.id;
  const state = req.body.state;
  Data.updateCommentState(commentId, state, success => {
    if (success) {
      res.sendStatus(200);
    } else {
      res.sendStatus(500);
    }
  });
});

router.post('/comment', function(req, res) {
  const currentTime = new Date();
  Data.createComment(
    {
      articleId: req.body.articleId,
      time: currentTime.toLocaleString(),
      author: sanitizeHtml(req.body.author),
      content: sanitizeHtml(parser(lexer(req.body.content)))
    },
    error => {
      if (error != null) {
        console.log(error.message);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
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
