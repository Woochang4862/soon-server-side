const express = require('express');
const router = express.Router();
const request = require('request');
const redis = require('redis');
const passport = require('passport');
const _api_key = require('../config/tmdb').api_key

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

router.get('/status', function(req, res){
  if(req.isAuthenticated()){
    res.json({
      'message':'Authenticated Success',
      'username':req.user.username
    })
  }else{
    res.json({
      'message':'Authenticated Failed',
      'error_message':function(){
        if(req.flash('signupMessage'))
          return req.flash('signupMessage')
        if(req.flash('loginMessage'))
          return req.flash('loginMessage')
      }
    })
  }
});

router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/api/status', 
  failureRedirect: '/api/status', 
  failureFlash: true 
}),
  function (req, res) {
    console.log("hello");

    if (req.body.remember) {
      req.session.cookie.maxAge = 1000 * 60 * 3;
    } else {
      req.session.cookie.expires = false;
    }
    res.redirect('/status');
  });

router.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/api/status', 
  failureRedirect: '/api/status',
  failureFlash: true
}));

router.get('/logout', isLoggedIn, function (req, res) {
  req.logout();
  res.redirect('/status');
});

// route middleware to make sure
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/status');
}

router.get('/genre/all', function (req, res) {
  const KEY_GENRE_ALL = req.originalUrl;
  return client.get(KEY_GENRE_ALL, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data)
    } else {
      var options = {
        method: 'GET',
        url: 'https://api.themoviedb.org/3/genre/movie/list',
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

router.get('/movie/company/:region/:id/:page', function (req, res) {
  console.log(req.path);

  var request_body = req.params;
  var currentDate = new Date().yyyymmdd();
  console.log(request_body);
  console.log(currentDate);

  var id = request_body.id;
  var _page = request_body.page;
  var _region = request_body.region;

  const KEY_MOVIE_COMPANY_REGION_ID_PAGE = req.originalUrl;

  return client.get(KEY_MOVIE_COMPANY_REGION_ID_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data);
    } else {
      var options = {
        method: 'GET',
        url: 'https://api.themoviedb.org/3/discover/movie',
        qs:
        {
          with_companies: id,
          'release_date.gte': currentDate,
          page: _page,
          include_video: 'false',
          region: 'US',
          include_adult: 'true',
          sort_by: 'popularity.desc',
          language: 'ko-KR',
          api_key: _api_key
        }
      };

      request(options, function (error, response, _body) {
        if (error) throw new Error(error);
        var body = JSON.parse(_body);
        body["source"] = 'api';
        client.setex(KEY_MOVIE_COMPANY_REGION_ID_PAGE, caching_time, JSON.stringify(body));
        res.json(body);
      });
    }
  })
});

router.get('/movie/genre/:region/:id/:page', function (req, res) {
  console.log(req.path);

  var request_body = req.params;
  var currentDate = new Date().yyyymmdd();
  console.log(request_body);
  console.log(currentDate);

  var id = request_body.id;
  var _page = request_body.page;
  var _region = request_body.region;

  const KEY_MOVIE_GENRE_REGION_ID_PAGE = req.originalUrl;

  return client.get(KEY_MOVIE_GENRE_REGION_ID_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data);
    } else {
      var options = {
        method: 'GET',
        url: 'https://api.themoviedb.org/3/discover/movie',
        qs:
        {
          with_genres: id,
          'release_date.gte': currentDate,
          page: _page,
          include_video: 'false',
          include_adult: 'true',
          region: _region,
          sort_by: 'popularity.desc',
          language: 'ko-KR',
          api_key: _api_key
        }
      };

      request(options, function (error, response, _body) {
        if (error) throw new Error(error);
        var body = JSON.parse(_body);
        body["source"] = 'api';
        client.setex(KEY_MOVIE_GENRE_REGION_ID_PAGE, caching_time, JSON.stringify(body));
        return res.json(body);
      });
    }
  });
});

router.get('/movie/date/:region/:date/:page', function (req, res) {
  console.log(req.path);

  var request_body = req.params;
  console.log(request_body);

  var date = request_body.date;
  var _page = request_body.page;
  var _region = request_body.region;
  console.log(date);

  const KEY_MOVIE_DATE_REGION_DATE_PAGE = req.originalUrl;

  return client.get(KEY_MOVIE_DATE_REGION_DATE_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return red.json(data);
    } else {
      var options = {
        method: 'GET',
        url: 'https://api.themoviedb.org/3/discover/movie',
        qs:
        {
          'primary_release_date.gte': date,
          'primary_release_date.lte': date,
          page: _page,
          include_video: 'false',
          include_adult: 'true',
          sort_by: 'popularity.desc',
          region: _region,
          language: 'ko-KR',
          api_key: _api_key
        }
      };

      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        var body = JSON.parse(body);
        body["source"] = 'api';
        client.setex(KEY_MOVIE_DATE_REGION_DATE_PAGE, caching_time, JSON.stringify(body));
        return res.json(body);
      });
    }
  });
});

var searchCompanies = function (req, res, next) {
  var _query = req.params.query;
  var _page = req.params.page;
  var _region = req.params.region;

  const KEY_SEARCH_COMPANY_REGION_QUERY_PAGE = req.originalUrl;

  client.get(KEY_SEARCH_COMPANY_REGION_QUERY_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      req.companies = data;
      next();
    } else {
      var options = {
        method: 'GET',
        url: _url + '/search/company',
        qs:
        {
          include_adult: 'true',
          page: _page,
          query: _query,
          language: 'ko-KR',
          api_key: _api_key,
          region: _region
        }
      };

      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        var body = JSON.parse(body);
        body["source"] = 'api';
        client.setex(KEY_SEARCH_COMPANY_REGION_QUERY_PAGE, caching_time, JSON.stringify(body));
        req.companies = body;
        next();
      });
    }
  });
};

var searchMovies = function (req, res, next) {
  var _query = req.params.query;
  var _page = req.params.page;
  var _region = req.params.region;

  const KEY_SEARCH_MOVIE_REGION_QUERY_PAGE = req.originalUrl;

  client.get(KEY_SEARCH_MOVIE_REGION_QUERY_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      req.movies = data;
      next();
    } else {
      var options = {
        method: 'GET',
        url: _url + '/search/movie',
        qs:
        {
          include_adult: 'true',
          page: _page,
          query: _query,
          language: 'ko-KR',
          api_key: _api_key,
          region: _region
        }
      };

      request(options, function (error, response, _body) {
        if (error) throw new Error(error);
        try {
          var body = JSON.parse(_body);
          body["source"] = 'api';
          client.setex(KEY_SEARCH_MOVIE_REGION_QUERY_PAGE, caching_time, JSON.stringify(body));
          req.movies = body;
          next();
        } catch (e) {
          res.redirect("/message/checking/server");
        }
      });
    }
  });
};

router.get('/search/multi/:region/:query/:page', searchCompanies, searchMovies, function (req, res) {
  console.log(req.path);

  var _query = req.params.query;
  var _page = req.params.page;
  var _region = req.params.region;
  console.log("request query : " + _query);
  console.log("request page : " + _page);
  console.log("request region : " + _region);
  

  var companies = req.companies;
  var movies = req.movies;

  if (companies.total_results >= movies.total_results) {
    res.json({ "companies": true, "results": { "movies": movies, "companies": companies } });
  }
  else {
    res.json({ "companies": false, "results": { "movies": movies, "companies": companies } });
  }
});

router.get('/search/company/:region/:query/:page', searchCompanies, function (req, res) {
  console.log(req.path);

  var _query = req.params.query;
  var _page = req.params.page;
  var _region = req.params.region;
  console.log("request query : " + _query);
  console.log("request page : " + _page);
  console.log("request region : " + _region);
  res.json(req.companies);
});

router.get('/search/movie/:region/:query/:page', searchMovies, function (req, res) {
  console.log(req.path);

  var _query = req.params.query;
  var _page = req.params.page;
  var _region = req.params.region;
  console.log("request query : " + _query);
  console.log("request page : " + _page);
  console.log("request region : " + _region);
  console.log(req.movies);
  res.json(req.movies);
});

router.get('/movie/detail/:region/:id', (req, res) => {
  console.log(req.path);

  var id = req.params.id;
  var _region = req.params.region;

  const KEY_MOVIE_DETAIL_REGION_ID = req.originalUrl;

  return client.get(KEY_MOVIE_DETAIL_REGION_ID, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data);
    } else {
      var options = {
        method: 'GET',
        url: _url + '/movie/' + id,
        qs:
        {
          append_to_response: 'videos,images',
          language: 'ko-KR',
          api_key: 'dacdeb969b934abef7e5002b69d6c9ae',
          region: _region
        }
      };

      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        var body = JSON.parse(body);
        body["source"] = 'api';
        client.setex(KEY_MOVIE_DETAIL_REGION_ID, caching_time, JSON.stringify(body));
        return res.json(body);
      });
    }
  });
});

router.get('/movie/TMM/:region/:page', function (req, res) {
  console.log(req.path);
  var now = new Date();
  var firstDate = new Date(now.getYear() + 1900, now.getMonth(), 1).yyyymmdd();
  var lastDate = new Date(now.getYear() + 1900, now.getMonth() + 1, 0).yyyymmdd();
  console.log(firstDate);
  console.log(lastDate);
  var _region = req.params.region;
  var _page = req.params.page;

  const KEY_MOVIE_TMM_REGION_PAGE = req.originalUrl;

  return client.get(KEY_MOVIE_TMM_REGION_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      console.log(data);
      return res.json(data);
    } else {
      var options = {
        method: 'GET',
        url: _url + '/discover/movie',
        qs:
        {
          'release_date.lte': lastDate,
          'release_date.gte': firstDate,
          'primary_release_date.lte': lastDate,
          'primary_release_date.gte': firstDate,
          page: _page,
          include_video: 'false',
          region: _region,
          include_adult: 'true',
          sort_by: 'popularity.desc',
          language: 'ko-KR',
          api_key: _api_key
        }
      };

      request(options, function (error, response, _body) {
        if (error) throw new Error(error);
        var body = JSON.parse(_body);
        body["source"] = 'api';
        client.setex(KEY_MOVIE_TMM_REGION_PAGE, caching_time, JSON.stringify(body));
        console.log(body);
        return res.json(body);
      });
    }
  });
});

//TODO:Cron을 이용하여 제작사 알림 등록하기 함수(이 제작사를 등록한 사용자가 없으면 Cron삭제, 그게 아니면 request 값과 DB비교 처리)

module.exports = router;
