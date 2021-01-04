const express = require('express');
const router = express.Router();
const request = require('request');
const redis = require('redis');
const _api_key = require('../config/tmdb').api_key
const async = require("async");

const client = redis.createClient(6379);
const caching_time = 300;
client.on('error', (err) => {
  console.log("Error " + err);
});
const _url = 'https://api.themoviedb.org/3';

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

router.get('/all', function (req, res) {
  const KEY_GENRE_ALL = req.originalUrl;
  console.log(KEY_GENRE_ALL);
  return client.get(KEY_GENRE_ALL, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data)
    } else {
      var options = {
        method: 'GET',
        url: _url + '/genre/movie/list',
        qs: { language: 'ko-KR', api_key: _api_key }
      };

      var genreImgs = Object();

      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        console.log(body);
        var result = JSON.parse(body);
        const currentDate = new Date().yyyymmdd();
        var i = 0;
        async.whilst(
          function () {
            return i < result["genres"].length;
          },
          function (next) {
            var options = {
              method: 'GET',
              url: _url + '/discover/movie',
              qs:
              {
                with_genres: result["genres"][i].id,
                'release_date.gte': currentDate,
                page: 1,
                include_video: 'false',
                include_adult: 'false',
                region: 'KR',
                sort_by: 'popularity.desc',
                language: 'ko-KR',
                api_key: _api_key
              }
            };

            request(options, function (error, response, _body) {
              if (error) throw new Error(error);
              var body = JSON.parse(_body);
              
              if (body["results"].length != 0) {
                for (let e of body["results"]) {
                  if (e.poster_path) { genreImgs[result["genres"][i].id] = e.poster_path; break; }
                  if (e.backdrop_path) { genreImgs[result["genres"][i].id] = e.backdrop_path; break; }
                }
                if (!genreImgs[result["genres"][i].id]) {
                  // 제공된 이미지가 없습니다
                  genreImgs[result["genres"][i].id] = "제공된 이미지가 없습니다";
                }
              } else {
                // 상영예정인 영화가 없습니다
                genreImgs[result["genres"][i].id] = "상영예정인 영화가 없습니다";
              }
              i++;
              next();
            });
          },
          function (err) {
            if (err) console.log(new Error(err));
            for (var i = 0; i < result["genres"].length; i++) {
              result["genres"][i]["icon_path"] = genreImgs[result["genres"][i].id];
            }
            result["source"] = 'api';
            client.setex(KEY_GENRE_ALL, caching_time, JSON.stringify(result));
            return res.json(result);
          }
        );
      });
    }
  });
});

module.exports = router;