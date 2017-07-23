var express = require('express');
var path = require('path');
var pkg = require('./package');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var Hashids = require('hashids');
var io = require('socket.io')();

var session = require('express-session');
var flash = require('connect-flash');
var config = require('config-lite')(__dirname);
var RedisStore = require('connect-redis')(session);

var winston = require('winston');
var expressWinston = require('express-winston');

var index = require('./routes/index')(io);
var users = require('./routes/users');
var books = require('./routes/books');
var ajaxs = require('./routes/ajaxs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressValidator());

 
var sessionStore = new RedisStore({
  "host": "127.0.0.1",
  "port": "6379",
});

app.use(expressValidator({
 customValidators: {
    isArray: function(value) {
    	return Array.isArray(value);
    },
    inArray: function(elem, array) {
      if(array.indexOf) {
          return array.indexOf(elem) !== -1;
      }
      var i, len = array.length;
      for(i = 0; i < len; i++) {
        if(array[i] === elem ) {
          return true;
        }
      }
      return false;
    },
    gte: function(param, num) {
      return param >= num;
    },
    lowerToEqual: function (param, str) {
    	return param.toLowerCase() === str.toLowerCase();
    }
 }
}));

app.use(session({
	name: config.session.key,
	secret: config.session.secret,
	resave: true,
	saveUninitialized: true,
  store: sessionStore,
	cookie: {
		maxAge: config.session.maxAge
	}
}));

app.use(flash());

app.use(function (req, res, next) {
	res.locals.user = req.session.user;
  res.locals.ebook = {
    title: pkg.name,
    description: pkg.description,
    pageTitle: ''
  };
	res.locals.page = 'default';
	res.locals.success = req.flash('success').toString();
	res.locals.errors = req.flash('errors').toString();
	res.locals.message = req.flash('message').toString();
  res.locals.hashEncodeId = function (id, id2 = false) {
    var hashids = new Hashids('ebook-id', 6);
    var arr = [id];
    if (id2) {
      arr.push(id2);
    }
    return hashids.encode(arr);
  }
	next();
})

app.io = io;
var socketLib = require('./lib/socket')(io, sessionStore);


// 正常请求的日志
app.use(expressWinston.logger({
  transports: [
    new winston.transports.File({
      filename: 'logs/success.log'
    })
  ]
}));

app.use('/', index);
app.use('/', users);
app.use('/book', books);
app.use('/ajax', ajaxs);

// 错误请求的日志
app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true
    }),
    new winston.transports.File({
      filename: 'logs/error.log'
    })
  ]
}));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.locals.page = 'not-find-page';
  res.status(404);
  res.render('404');
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
