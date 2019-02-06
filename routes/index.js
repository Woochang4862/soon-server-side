const express = require('express');
const router = express.Router();
const request = require('request');

const _api_key = 'dacdeb969b934abef7e5002b69d6c9ae';
const _url = 'https://api.themoviedb.org/3';

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

router.get('/genre/all', function (req, res) {
  var options = {
    method: 'GET',
    url: 'https://api.themoviedb.org/3/genre/movie/list',
    qs: { language: 'ko-KR', api_key: _api_key },
    body: '{}'
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    var result = JSON.parse(body);
    for (var i = 0; i < result["genres"].length; i++) {
      result["genres"][i]["icon_path"] = "/images/" + result["genres"][i]["id"] + ".png";
    }
    res.json(result);
  });
});

router.get('/movie/company/:id/:page', function (req, res) {
  console.log(req.path);

  var request_body = req.params;
  var currentDate = new Date().yyyymmdd();
  console.log(request_body);
  console.log(currentDate);

  var id = request_body.id;
  var _page = request_body.page;

  var options = {
    method: 'GET',
    url: 'https://api.themoviedb.org/3/discover/movie',
    qs:
    {
      with_companies: id,
      'primary_release_date.gte': currentDate,
      page: _page,
      include_video: 'false',
      include_adult: 'true',
      sort_by: 'popularity.desc',
      language: 'ko-KR',
      api_key: _api_key
    },
    body: '{}'
  };

  request(options, function (error, response, _body) {
    if (error) throw new Error(error);
    var body = JSON.parse(_body);
    res.json(body);
    // var resultSize = body["results"].length;
    // var resultCnt = 0;
    // if (resultSize === resultCnt)
    //   res.json(body);
    // body["results"].forEach((result, index) => {
    //   var options = {
    //     method: 'GET',
    //     url: 'https://api.themoviedb.org/3/movie/' + result["id"],
    //     qs:
    //     {
    //       language: 'ko-KR',
    //       api_key: _api_key
    //     },
    //     body: '{}'
    //   };

    //   request(options, function (error, response, _body) {
    //     if (error) throw new Error(error);
    //     body["results"][index] = JSON.parse(_body);
    //     resultCnt++;
    //     if (resultSize === resultCnt)
    //       res.json(body);
    //   });
    // });
  });
});

router.get('/movie/genre/:id/:page', function (req, res) {
  console.log(req.path);

  var request_body = req.params;
  var currentDate = new Date().yyyymmdd();
  console.log(request_body);
  console.log(currentDate);

  var id = request_body.id;
  var _page = request_body.page;

  var options = {
    method: 'GET',
    url: 'https://api.themoviedb.org/3/discover/movie',
    qs:
    {
      with_genres: id,
      'primary_release_date.gte': currentDate,
      page: _page,
      include_video: 'false',
      include_adult: 'true',
      sort_by: 'popularity.desc',
      language: 'ko-KR',
      api_key: _api_key
    },
    body: '{}'
  };

  request(options, function (error, response, _body) {
    if (error) throw new Error(error);
    var body = JSON.parse(_body);
    res.json(body);
    // var resultSize = body["results"].length;
    // var resultCnt = 0;
    // if (resultSize === resultCnt)
    //   res.json(body);
    // body["results"].forEach((result, index) => {
    //   var options = {
    //     method: 'GET',
    //     url: 'https://api.themoviedb.org/3/movie/' + result["id"],
    //     qs:
    //     {
    //       language: 'ko-KR',
    //       api_key: _api_key
    //     },
    //     body: '{}'
    //   };

    //   request(options, function (error, response, _body) {
    //     if (error) throw new Error(error);
    //     body["results"][index] = JSON.parse(_body);
    //     resultCnt++;
    //     if (resultSize === resultCnt)
    //       res.json(body);
    //   });
    // });
  });
});

router.get('/movie/date/:date/:page', function (req, res) {
  console.log(req.path);

  var request_body = req.params;
  console.log(request_body);

  var date = request_body.date;
  var _page = request_body.page;
  console.log(date);

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
      language: 'ko-KR',
      api_key: _api_key
    },
    body: '{}'
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    res.json(JSON.parse(body));
  });
});

var searchCompanies = function (req, res, next) {
  var _query = req.params.query;
  var _page = req.params.page;
  var options = {
    method: 'GET',
    url: _url + '/search/company',
    qs:
    {
      include_adult: 'true',
      page: _page,
      query: _query,
      language: 'ko-KR',
      api_key: _api_key
    },
    body: '{}'
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    req.companies = JSON.parse(body);
    next();
  });
};

var searchMovies = function (req, res, next) {
  var _query = req.params.query;
  var _page = req.params.page;
  var options = {
    method: 'GET',
    url: _url + '/search/movie',
    qs:
    {
      include_adult: 'true',
      page: _page,
      query: _query,
      language: 'ko-KR',
      api_key: _api_key
    },
    body: '{}'
  };

  request(options, function (error, response, _body) {
    if (error) throw new Error(error);

    var body = JSON.parse(_body);
    // var resultSize = body["results"].length;
    // var resultCnt = 0;
    // if (resultSize === resultCnt) {
    //   req.movies = body;
    //   next();
    // }
    // body["results"].forEach((result, index) => {
    //   var options = {
    //     method: 'GET',
    //     url: 'https://api.themoviedb.org/3/movie/' + result["id"],
    //     qs:
    //     {
    //       language: 'ko-KR',
    //       api_key: _api_key
    //     },
    //     body: '{}'
    //   };

    //   request(options, function (error, response, _body) {
    //     if (error) throw new Error(error);
    //     body["results"][index] = JSON.parse(_body);
    //     resultCnt++;
    //     if (resultSize === resultCnt) {
    //       req.movies = body;
    //       next();
    //     }
    //   });
    // });
    req.movies = body;
    next();
  });
};

router.get('/search/multi/:query/:page', searchCompanies, searchMovies, function (req, res) {
  console.log(req.path);

  var _query = req.params.query;
  var _page = req.params.page;
  console.log("request query : " + _query);
  console.log("request page : " + _page);

  var companies = req.companies;
  var movies = req.movies;

  if (companies.total_results >= movies.total_results) {
    res.json({ "companies": true, "results": { "movies": movies, "companies": companies } });
  }
  else {
    res.json({ "companies": false, "results": { "movies": movies, "companies": companies } });
  }
});

router.get('/search/company/:query/:page', searchCompanies, function (req, res) {
  console.log(req.path);

  var _query = req.params.query;
  var _page = req.params.page;
  console.log("request query : " + _query);
  console.log("request page : " + _page);
  res.json(req.companies);
});

router.get('/search/movie/:query/:page', searchMovies, function (req, res) {
  console.log(req.path);

  var _query = req.params.query;
  var _page = req.params.page;
  console.log("request query : " + _query);
  console.log("request page : " + _page);
  console.log(req.movies);
  res.json(req.movies);
});

module.exports = router;