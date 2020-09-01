const express = require('express');
const http = require('http');
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
const fileRouter = require('./routes/file');
const updateConfig = require('./utils/util').updateConfig;
const normalizePort = require('./utils/util').normalizePort;
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const app = express();
const server = http.createServer(app);

const pageLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 30
});

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5
});

app.use(pageLimiter);
app.use('/api/comment', commentLimiter);
app.use(compression());
app.locals.config = {};
app.locals.page = undefined;
updateConfig(app.locals.config);

app.locals.loggedin = false;
app.locals.isAdmin = false;
app.locals.sitemap = undefined;

let port = normalizePort(process.env.PORT || 3000);
app.set('port', port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
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
app.use('/api/file', fileRouter);

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

server.listen(port);
server.on('error', err => {
  console.error(
    `An error occurred on the server, please check if port ${port} is occupied.`
  );
  console.error(err.toString());
});

server.on('listening', () => {
  console.log('\x1b[36m%s\x1b[0m', `Server listen on port: ${port}.`);
});

module.exports = app;
