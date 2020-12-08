const express = require('express');
const router = express.Router();
const request = require('request');
const redis = require('redis');
const _api_key = require('../config/tmdb').api_key

const client = redis.createClient(6379);
const caching_time = 300;
client.on('error', (err) => {
  console.log("Error " + err);
});
const _url = 'https://api.themoviedb.org/3';

router.get('/all', function (req, res) {
  const KEY_GENRE_ALL = req.originalUrl;
  return client.get(KEY_GENRE_ALL, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data)
    } else {
      var options = {
        method: 'GET',
        url: _url+'/genre/movie/list',
        qs: { language: 'ko-KR', api_key: _api_key }
      };

      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        console.log(body);
        var result = JSON.parse(body);
        for (var i = 0; i < result["genres"].length; i++) {
          result["genres"][i]["icon_path"] = "/genre/" + result["genres"][i]["id"] + ".png";
        }
        result["source"] = 'api';
        client.setex(KEY_GENRE_ALL, caching_time, JSON.stringify(result));
        return res.json(result);
      });
    }
  });
});

module.exports = router;