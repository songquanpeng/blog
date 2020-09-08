const serveStatic = require('serve-static');
const path = require('path');
const indexRouter = require('../routes/index');
const commentRouter = require('../routes/comment');
const pageRouter = require('../routes/page');
const userRouter = require('../routes/user');
const optionRouter = require('../routes/option');
const fileRouter = require('../routes/file');

function configureApp(app) {
  app.set(
    'views',
    path.join(__dirname, `../themes/${app.locals.config.theme}`)
  );

  app.use(
    '/static',
    serveStatic(
      path.join(__dirname, `../themes/${app.locals.config.theme}/static`),
      {
        maxAge: '600000'
      }
    )
  );

  app.use(
    serveStatic(path.join(__dirname, '../public'), {
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
    console.error(err.stack);
    if (!res.headersSent) {
      res.send(err.message);
    }
  });
}

module.exports = {
  configureApp
};
