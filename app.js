var createError = require('http-errors');
var express = require('express');
var session  = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var genreRouter = require('./routes/genre');
var movieRouter = require('./routes/movie');
var searchRouter = require('./routes/search');
var authRouter = require('./routes/auth');
var alarmRouter = require('./routes/alarm');
var messageRouter = require('./routes/message');
var passport = require('passport');
var flash = require('connect-flash');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

require('./config/passport')(passport); 
app.use(session({
	secret: 'vidyapathaisalwaysrunning',
	resave: true,
	saveUninitialized: true
 } )); // session secret
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use('/api/genre', genreRouter);
app.use('/api/movie', movieRouter);
app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/alarm',alarmRouter)
app.use('/message', messageRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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
