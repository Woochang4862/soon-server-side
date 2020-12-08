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