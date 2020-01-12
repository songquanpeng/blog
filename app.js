const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const serveStatic = require('serve-static');
const indexRouter = require('./routes/index');
const commentRouter = require('./routes/comment');
const pageRouter = require('./routes/page');
const userRouter = require('./routes/user');
const config = require('./config').config;
const app = express();

app.locals.config = config;
app.locals.title = config.motto + ' | ' + config.siteName;
app.locals.keywords = config.siteName;
app.locals.description = config.siteDescription;
app.locals.info = '';
app.locals.error = '';
app.locals.loggedIn = false;
app.locals.isRootUser = false;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser('better'));
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: 'better'
  })
);

app.use(flash());
app.use(
  serveStatic(path.join(__dirname, 'public'), {
    maxAge: '600000'
  })
);
app.use('*', (req, res, next) => {
  if (req.session.user !== undefined) {
    res.locals.loggedIn = true;
    res.locals.isRootUser = req.session.user.name === 'root';
  }
  next();
});
app.use('/', indexRouter);
app.use('/api/page', pageRouter);
app.use('/api/comment', commentRouter);
app.use('/api/user', userRouter);

app.use(function(req, res, next) {
  res.locals.message = ':{404 Not Found}';
  if (!res.headersSent) {
    res.render('error');
  }
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  console.error(err.message);
  if (!res.headersSent) {
    res.render('error');
  }
});

module.exports = app;
