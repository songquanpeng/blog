const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');
const record = require('./middlewares/record').record;

const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
// app.engine('.html', require('ejs').__express)
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser("better"));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'better'
}));
app.use(flash());

app.use(express.static(path.join(__dirname, 'public')));

// app.locals.topArticles = [{'link': 'http://justsong.xyz', "title": "Example A"}, {
//     'link': 'http://justsong.xyz',
//     "title": "Example B"
// }];

app.locals.services = [
    // {'link': '/image', "title": "Image Show"},
    // {'link': '/video', "title": "Watch Videos"},
    // {'link': '/music', "title": "Listen Music"},
    // {'link': '/book', "title": "Read Book"},
    // {'link': '/file', "title": "Cloud Disk"},
    // {'link': '/message_board', "title": "Message Board"},
    // {'link': '/form', "title": "Information Collection"},
    // {'link': '/help', "title": "Help Center"},
    // {'link': '/chat', "title": "Chat With Others"},
];
app.locals.title = "JustSong's blog";
app.locals.keywords = "JustSong blog";
app.locals.description = "JustSong's blog";

app.use('*', record);
app.use('/', indexRouter);
app.use('/api', apiRouter);

// catch 404
app.use(function (req, res, next) {
    // next(createError(404));
    if (!res.headersSent) {
        res.status(404).render('404', {
            "error": ":{404 Not Found}",
            "info": ""
        });
    }
    next()
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error', {
        "error": "We are sorry. Some error occurred.",
        "info": ""
    });
    //res.send("error");
    next();
});

module.exports = app;
