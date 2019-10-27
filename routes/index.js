'use strict';
const express = require('express');
const router = express.Router();
const Stream = require('stream');
const Article = require('../models/article').Article;
const Data = require('../models/data').Data;
const User = require('../models/user').User;
const checkLogin = require('../middlewares/check').checkLogin;
const lexer = require('marked').lexer;
const parser = require('marked').parser;
const sanitizeHtml = require('sanitize-html');
const sitemap = require('sitemap');
const titleToLink = require('../utils/util').titleToLink;

router.get('/', function(req, res) {
  Article.getAllArticlesIntroduction((error, articles) => {
    if (error) {
      console.error(error.message);
    }
    articles.sort(function(a, b) {
      return new Date(b.time) - new Date(a.time);
    });
    let articlesByTimes = articles.slice(0, 3);
    let articlesByViews = articles.slice(3);
    articlesByViews.sort(function(a, b) {
      return b.views - a.views;
    });
    res.render('index', {
      articles: articlesByTimes.concat(articlesByViews),
      info: req.flash('info'),
      error: req.flash('error'),
      currentUser: req.session.user ? req.session.user.name : undefined
    });
  });
});

router.get('/article/:link', function(req, res, next) {
  Data.createStatisticsRecord();
  Article.getArticleByLink(req.params.link, (error, article) => {
    if (error != null || article === undefined) {
      next();
    } else {
      let copyright = `\n\n---\n**All right reserved.**\n**Original link:** ${req.app.locals.config.siteUrl}/article/${req.params.link}`;
      article.content += copyright;
      article.content = parser(lexer(article.content));
      res.render('article', {
        article: article,
        title: article.title,
        keywords: article.tag,
        description: article.description
      });
    }
  });
});

router.get('/export/:link', checkLogin, function(req, res, next) {
  Article.getArticleByLink(req.params.link, (error, article) => {
    if (error != null || article === undefined) {
      next();
    } else {
      const filename = article.link + '.md';
      res.setHeader(
        'Content-disposition',
        "attachment; filename*=UTF-8''" + encodeURIComponent(filename)
      );
      res.setHeader('Content-type', 'text/md');
      const fileStream = new Stream.Readable({
        read(size) {
          return true;
        }
      });
      fileStream.pipe(res);
      fileStream.push(article.content);
      res.end();
    }
  });
});

router.get('/edit/:link', checkLogin, function(req, res) {
  const link = req.params.link;
  const username = req.session.user.name;
  Article.getArticleAuthorByLink(link, (error, data) => {
    if (error) {
      res.render('message');
    } else if (data.author !== username) {
      req.flash('error', 'Permission denied');
      res.redirect('/user');
    } else {
      Article.getArticleByLink(link, (error, article) => {
        if (error !== null || article === undefined) {
          res.render('404');
        } else {
          res.render('post', {
            article: article
          });
        }
      });
    }
  });
});

router.get('/user', function(req, res) {
  if (req.session.user === undefined) {
    res.render('login', { error: req.flash('error'), info: req.flash('info') });
  } else {
    Article.getAllArticlesIntroduction((error, articles) => {
      User.all((error, users) => {
        res.render('user', {
          info: req.flash('info'),
          error: req.flash('error'),
          articles: articles.reverse(),
          users: users
        });
      });
    });
  }
});

router.get('/page/:pageName', function(req, res) {
  Article.getSpecialPage(
    req.params.pageName.toLowerCase(),
    (error, article) => {
      if (error != null || article === undefined) {
        res.render('message', {
          error: 'The root user has not created this page yet.',
          info: ''
        });
      } else {
        article.content = parser(
          lexer(
            article.content
              .split('\n')
              .splice(3)
              .join('\n')
          )
        );
        res.render('article', {
          article: article,
          title: article.title,
          keywords: article.tag,
          description: article.description
        });
      }
    }
  );
});

router.get('/archive', function(req, res) {
  Article.getAllArticlesIntroduction((error, articles) => {
    res.render('archive', {
      articles: articles.reverse(),
      title: 'Archive',
      keywords: 'archive site map',
      description: 'archive for this website',
      info: req.flash('info'),
      error: req.flash('error')
    });
  });
});

router.get('/sitemap.xml', function(req, res) {
  const host = 'https://iamazing.cn';
  let sitemapOption = {
    hostname: host,
    cacheTime: 600000,
    urls: [host]
  };
  Article.getAllArticlesIntroduction((error, articles) => {
    articles.forEach(item => {
      sitemapOption.urls.push({
        url: `/article/` + item.link,
        changefreq: 'daily',
        lastmod: new Date(item.time)
      });
    });
    let xml = sitemap.createSitemap(sitemapOption).toString();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
});

router.get('/post', checkLogin, function(req, res) {
  res.render('post', {
    article: undefined
  });
});

router.get('/chat', checkLogin, function(req, res) {
  Data.getRecentChats((error, messages) => {
    res.render('chat', {
      info: req.flash('info'),
      error: req.flash('error'),
      messages: messages.reverse()
    });
  });
});

router.get('/tag/:tag', function(req, res) {
  Article.getArticlesByTag(req.params.tag, (error, articles) => {
    res.render('list', {
      info: req.flash('info'),
      error: req.flash('error'),
      articles: articles.reverse(),
      isAbleToModify: false
    });
  });
});

router.get('/date/:date', function(req, res) {
  Article.getArticlesByDate(req.params.date, (error, articles) => {
    res.render('list', {
      info: req.flash('info'),
      error: req.flash('error'),
      articles: articles.reverse(),
      isAbleToModify: false
    });
  });
});

router.get('/user/:name', function(req, res) {
  Article.getArticlesByAuthor(req.params.name, (error, articles) => {
    let isAbleToModify = false;
    if (req.session.user !== undefined) {
      isAbleToModify = req.session.user.name === req.params.name;
    }
    res.render('list', {
      info: req.flash('info'),
      error: req.flash('error'),
      articles: articles.reverse(),
      isAbleToModify: isAbleToModify
    });
  });
});

router.get('/logout', function(req, res, next) {
  req.session.user = undefined;
  req.flash('info', 'Logout Successfully');
  res.redirect('/');
});

module.exports = router;
