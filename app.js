import createError from 'http-errors';
import express from 'express';
import session  from 'express-session';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import genreRouter from './routes/genre.js';
import movieRouter from './routes/movie.js';
import searchRouter from './routes/search.js';
import alarmRouter from './routes/alarm.js';
import messageRouter from './routes/message.js';

var app = express();

const __dirname = path.resolve();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/genre', genreRouter);
app.use('/api/movie', movieRouter);
app.use('/api/search', searchRouter);
app.use('/api/alarm',alarmRouter)
app.use('/message', messageRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.sendStatus(404);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.sendStatus(err.status || 500);
});

export default app;
