const express = require('express');
const http = require('http');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const updateConfig = require('./utils/util').updateConfig;
const configureApp = require('./utils/config').configureApp;
const loadAboutContent = require('./utils/util').loadAboutContent;
const rateLimit = require('express-rate-limit');
const compression = require('compression');
// const events = require('events');
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

app.locals.config = {};
app.locals.config.theme = 'bulma';
app.locals.page = undefined;
app.locals.about = 'No page has link "about"!';
app.locals.loggedin = false;
app.locals.isAdmin = false;
app.locals.sitemap = undefined;
// app.locals.eventEmitter = new events.EventEmitter();
// app.locals.eventEmitter.on('reload_config', () => {
//   console.log('Processing event: reload_config.');
//   configureApp(app);
// });

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

updateConfig(app.locals.config, () => {
  configureApp(app);
});
loadAboutContent(app);

let port = process.env.PORT || 3000;
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
