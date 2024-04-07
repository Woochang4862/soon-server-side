import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import genreRouter from './routes/genre.js';
import movieRouter from './routes/movie.js';
import searchRouter from './routes/search.js';
import alarmRouter from './routes/alarm.js';
import messageRouter from './routes/message.js';

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

var app = express();

const __dirname = path.resolve();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Soon Express API with Swagger",
      version: "0.1.0",
      description:
        "This is a simple CRUD API application made with Express and documented with Swagger",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
      contact: {
        name: "Woochang",
        url: "https://woochang4862.github.io",
        email: "lusle.soon@gmail.com",
      },
    },
    servers: [
      {
        url: "http://34.229.27.130:3000",
      },
    ],
  },
  apis: ["routes/movie.js", "routes/alarm.js", "routes/genre.js", "routes/search.js"],
};

const specs = swaggerJsdoc(options);

app.use("/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

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
