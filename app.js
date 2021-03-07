const express = require('express');
const http = require('http');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const updateConfig = require('./common/util').updateConfig;
const config = require('./config');
const loadAboutContent = require('./common/util').loadAboutContent;
const enableRSS = require('./common/rss').enableRSS;
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const crypto = require('crypto');
const cors = require('cors');
const webRouter = require('./routes/web-router');
const apiRouterV1 = require('./routes/api-router.v1');
const app = express();
const server = http.createServer(app);

app.use(
  rateLimit({
    windowMs: 30 * 1000,
    max: 30
  })
);
app.use(
  '/api/comment',
  rateLimit({
    windowMs: 60 * 1000,
    max: 5
  })
);
app.use(compression());
app.locals.systemName = 'Blog';
app.locals.systemVersion = 'v0.4.3';
app.locals.config = {};
app.locals.config.theme = 'bulma';
app.locals.page = undefined;
app.locals.about = 'No page has link "about"!';
app.locals.loggedin = false;
app.locals.isAdmin = false;
app.locals.sitemap = undefined;
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser(crypto.randomBytes(64).toString('hex')));
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: crypto.randomBytes(64).toString('hex')
  })
);

app.use(flash());

app.use('/', webRouter);
app.use('/api/v1', cors(), apiRouterV1);

// TODO: updateConfig()
// updateConfig(app.locals.config, () => {
//   configureApp(app);
// });
// TODO: loadAboutContent(app);
// updateConfig(app.locals.config, () => {
//   configureApp(app);
// });
// TODO: enableRSS(app.locals.config);

server.listen(config.port);

server.on('error', err => {
  console.error(
    `An error occurred on the server, please check if port ${config.port} is occupied.`
  );
  console.error(err.toString());
});

server.on('listening', () => {
  console.log('\x1b[36m%s\x1b[0m', `Server listen on port: ${config.port}.`);
});

module.exports = app;
