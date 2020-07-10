const express = require('express');
const router = express.Router();
const request = require('request');
const redis = require('redis');
var FCM = require('fcm-node');
const serverKey = 'AAAAI0G_Y0Q:APA91bGhn2kP760NOiIen0omFbsXL5Y2rjo8xXMruA3NOB7ejNBWIFW0QvUfVejexO_ZBMppGcoBEFK_1rWeuI2SD2pWWXCkxmPToCh8usIQx9W25krGRGekcbo2WOS27YmazEWQQNgF';
const fcm = new FCM(serverKey);
const passport = require('passport');
const _api_key = require('../config/tmdb').api_key
const async = require("async");
const mysql = require('mysql');
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

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

router.get('/status', function (req, res) {
  if (req.isAuthenticated()) {
    res.json({
      'message': 'Authenticated Success',
      'username': req.user.username
    })
  } else {
    res.json({
      'message': 'Authenticated Failed',
      'error_message': function () {
        if (req.flash('signupMessage'))
          return req.flash('signupMessage')
        if (req.flash('loginMessage'))
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

router.get('/movie/company', function (req, res) {
  const qs = req.query;
  console.log(qs);
  const currentDate = new Date().yyyymmdd();
  console.log(currentDate);

  const id = qs.id;
  const _page = qs.page;
  const _region = qs.region;

  const KEY_MOVIE_COMPANY_REGION_ID_PAGE = req.originalUrl;

  return client.get(KEY_MOVIE_COMPANY_REGION_ID_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data);
    } else {
      var options = {
        method: 'GET',
        url: _url + '/discover/movie',
        qs:
        {
          with_companies: id,
          'release_date.gte': currentDate,
          page: _page,
          include_video: 'false',
          region: 'US',
          include_adult: 'false',
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

router.get('/movie/genre', function (req, res) {
  const qs = req.query;
  console.log(qs);
  const currentDate = new Date().yyyymmdd();
  console.log(currentDate);

  const id = qs.id;
  const _page = qs.page;
  const _region = qs.region;

  const KEY_MOVIE_GENRE_REGION_ID_PAGE = req.originalUrl;

  return client.get(KEY_MOVIE_GENRE_REGION_ID_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data);
    } else {
      var options = {
        method: 'GET',
        url: _url + '/discover/movie',
        qs:
        {
          with_genres: id,
          'release_date.gte': currentDate,
          page: _page,
          include_video: 'false',
          include_adult: 'false',
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

router.get('/movie/date', function (req, res) {
  const qs = req.query;
  console.log(qs);
  const date = qs.date;
  console.log(date);

  const _page = qs.page;
  const _region = qs.region;

  const KEY_MOVIE_DATE_REGION_DATE_PAGE = req.originalUrl;

  return client.get(KEY_MOVIE_DATE_REGION_DATE_PAGE, (err, data) => {
    if (data) {
      var data = JSON.parse(data);
      data["source"] = 'cache';
      return res.json(data);
    } else {
      var options = {
        method: 'GET',
        url: _url + '/discover/movie',
        qs:
        {
          'primary_release_date.gte': date,
          'primary_release_date.lte': date,
          page: _page,
          include_video: 'false',
          include_adult: 'false',
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

router.get('/movie/detail', (req, res) => {
  const qs = req.query;
  console.log(qs);
  const id = qs.id;
  const _region = qs.region;

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
          api_key: _api_key,
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

router.get('/movie/TMM', function (req, res) {
  const qs = req.query;
  console.log(qs);
  const now = new Date();
  const firstDate = new Date(now.getYear() + 1900, now.getMonth(), 1).yyyymmdd();
  const lastDate = new Date(now.getYear() + 1900, now.getMonth() + 1, 0).yyyymmdd();
  console.log("first date : "+firstDate);
  console.log("last date : "+lastDate);
  const _region = qs.region;
  const _page = qs.page;

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
          include_adult: 'false',
          sort_by: 'popularity.desc',
          language: 'ko-KR',
          api_key: _api_key
        }
      };

      request(options, function (error, response, _body) {
        if (error) throw new Error(error);
        var body = JSON.parse(_body);
        body["source"] = 'api';
        var results = body["results"];
        body["results"] = [];
        results.forEach(result => {
          if(result.popularity>=0){
            body["results"].push(result);
          } else {
            body["total_results"]--;
          }
        });
        client.setex(KEY_MOVIE_TMM_REGION_PAGE, caching_time, JSON.stringify(body));
        console.log(body);
        return res.json(body);
      });
    }
  });
});

router.get('/check/:token/subscribe/:topic', function (req, res) {
  var options = {
    url: "https://iid.googleapis.com/iid/info/" + req.params.token,
    headers: {
      'Authorization': 'Key=' + serverKey
    },
    qs: {
      details: true
    }
  };
  console.log(options);
  
  request(options, function (err, response, body) {
    if (err) throw err;
    var json = JSON.parse(response.body);
    console.log(json);
    var is_subscribed = json.rel.topics.hasOwnProperty(req.params.topic);
    res.json({
      "is_subscribed": is_subscribed
    });
  });
});

router.post('/add/alarm/company', function (req, res) {
  var options = {
    url: "https://iid.googleapis.com/iid/info/" + req.body.token,
    headers: {
      'Authorization': 'Key=' + serverKey
    },
    qs: {
      details: true
    }
  };
  request(options, function (err, response, body) {
    if (err) throw err;
    var json = JSON.parse(response.body);
    console.log(json);
    if (!json.rel.topics.hasOwnProperty(req.body.company_id)) {
      fcm.subscribeToTopic([req.body.token], req.body.company_id, (err, response) => {
        if (err) throw err;
        connection.query('SELECT * FROM ' + dbconfig.company_alarm_table + ' WHERE company_id ="' + req.body.company_id + '"', function (err, row) {
          if (err) throw err;
          if (row && row.length) {
            var sql = "UPDATE " + dbconfig.company_alarm_table + " SET member = member + 1 WHERE company_id = " + req.body.company_id;
            connection.query(sql, function (err, result) {
              if (err) throw err;
              console.log(result.affectedRows + " record(s) updated");
              return res.sendStatus(200);
            });
          } else {
            var insertQuery = "INSERT INTO `" + dbconfig.company_alarm_table + "` (company_id, member) values (?,1)";
            console.log(insertQuery);
            connection.query(insertQuery, [req.body.company_id], function (err, rows) {
              if (err) throw new Error(err)
              else {
                console.log(rows + " record inserted");
                connection.query("CREATE TABLE `" + req.body.company_id + "` (movie_id INT UNSIGNED PRIMARY KEY)", function (err, result) {
                  if (err) throw err;
                  console.log("Table created");
                  let oldPage = 1;
                  let nextPage = 2;
                  let movie_id_array = new Array();
                  async.whilst(function () {
                    // Check that oldPage is less than newPage
                    return oldPage < nextPage;
                  },
                    function (next) {
                      var options = {
                        method: 'GET',
                        url: 'https://api.themoviedb.org/3/discover/movie',
                        qs:
                        {
                          with_companies: req.body.company_id,
                          'release_date.gte': new Date().yyyymmdd(),
                          page: oldPage,
                          include_video: 'false',
                          region: 'US',
                          include_adult: 'false',
                          sort_by: 'popularity.desc',
                          language: 'ko-KR',
                          api_key: _api_key
                        }
                      };

                      request(options, function (error, response, body) {
                        if (error) throw error;
                        if (response.statusCode == 200) {
                          json = JSON.parse(body);
                          console.log(oldPage);
                          json.results.forEach(result => {
                            movie_id_array.push([result.id]);
                          });
                        }
                        if (json.results.length) {
                          // When the json has no more data loaded, nextPage will stop 
                          // incrementing hence become equal to oldPage and return 
                          // false in the test function.
                          nextPage++;
                        }
                        oldPage++;
                        next();
                      });
                    },
                    function (err) {
                      // All things are done!
                      if (err) throw err;
                      connection.query("INSERT INTO `" + req.body.company_id + "` (movie_id) VALUES ?", [movie_id_array], function (err, result) {
                        if (err) throw err;
                        console.log("Number of records inserted: " + result.affectedRows);
                        return res.sendStatus(200);
                      });
                    });
                });
              }
            });
          }
        });
      });
    } else {
      return res.sendStatus(200);
    }
  });
});

router.post('/remove/alarm/company', function (req, res) {
  var options = {
    url: "https://iid.googleapis.com/iid/info/" + req.body.token,
    headers: {
      'Authorization': 'Key=' + serverKey
    },
    qs: {
      details: true
    }
  };
  request(options, function (err, response, body) {
    if (err) throw err;
    var json = JSON.parse(response.body);
    console.log(json);
    if (json.rel.topics.hasOwnProperty(req.body.company_id)) {
      connection.query('SELECT * FROM ' + dbconfig.company_alarm_table + ' WHERE company_id="' + req.body.company_id + '"', function (err, row) {
        if (err) {
          throw new Error(error);
        } else {
          fcm.unsubscribeToTopic([req.body.token], row[0].company_id, (err, response) => {
            if (err) throw err;
            if (row && row.length) {
              var sql = "UPDATE " + dbconfig.company_alarm_table + " SET member = member - 1 WHERE company_id = " + row[0].company_id;
              connection.query(sql, function (err, result) {
                if (err) throw err;
                if (row[0].member <= 1) {
                  var deleteSql = "DELETE FROM " + dbconfig.company_alarm_table + " WHERE company_id = " + row[0].company_id + "; ";
                  var dropSql = "DROP TABLE `" + row[0].company_id + "`;"
                  connection.query(deleteSql + dropSql, function (err, results, field) {
                    if (err) throw err;
                    console.log("Number of records deleted: " + results[0].affectedRows);
                    console.log("Table " + results[1].affectedRows + " dropped");
                    return res.sendStatus(200);
                  });
                } else {
                  return res.sendStatus(200);
                }
              });
            }
          });
        }
      });
    } else {
      return res.sendStatus(200);
    }
  });
});

module.exports = router;