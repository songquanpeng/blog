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
const optionRouter = require('./routes/option');
const updateConfig = require('./utils/util').updateConfig;
const app = express();

app.locals.config = {};
app.locals.page = undefined;
updateConfig(app.locals.config);

app.locals.loggedin = false;
app.locals.isAdmin = false;

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
    res.locals.loggedin = true;
    res.locals.isAdmin = req.session.user.status >= 10;
  }
  next();
});

app.use('/', indexRouter);
app.use('/api/page', pageRouter);
app.use('/api/comment', commentRouter);
app.use('/api/user', userRouter);
app.use('/api/option', optionRouter);

app.use(function(req, res, next) {
  if (!res.headersSent) {
    res.render('message', {
      title: ':{404 Not Found}',
      message: 'The page you requested does not exist, I am sorry for that.'
    });
  }
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  console.error(err.message);
  if (!res.headersSent) {
    res.json({ status: false, message: err.message });
  }
});

module.exports = app;
