const express = require('express');
const router = express.Router();


var searchCompanies = function (req, res, next) {
    const qs = req.query;
    console.log(qs);
  
    const _query = qs.query;
    const _page = qs.page;
    const _region = qs.region;
    console.log("request query : " + _query);
    console.log("request page : " + _page);
    console.log("request region : " + _region);
  
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
            include_adult: 'false',
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
    const qs = req.query;
    console.log(qs);
  
    const _query = qs.query;
    const _page = qs.page;
    const _region = qs.region;
    console.log("request query : " + _query);
    console.log("request page : " + _page);
    console.log("request region : " + _region);
  
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
            include_adult: 'false',
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
  
  router.get('/search/multi', searchCompanies, searchMovies, function (req, res) {
    const companies = req.companies;
    const movies = req.movies;
  
    if (companies.total_results >= movies.total_results) {
      res.json({ "companies": true, "results": { "movies": movies, "companies": companies } });
    }
    else {
      res.json({ "companies": false, "results": { "movies": movies, "companies": companies } });
    }
  });
  
  router.get('/search/company', searchCompanies, function (req, res) {
    res.json(req.companies);
  });
  
  router.get('/search/movie', searchMovies, function (req, res) {
    res.json(req.movies);
  });

module.exports = router;