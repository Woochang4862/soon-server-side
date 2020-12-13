const express = require('express');
const router = express.Router();
const async = require("async");

const request = require('request');
const _api_key = require('../config/tmdb').api_key

var admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://soon-79c2e.firebaseio.com'
});
const serverKey = 'AAAAI0G_Y0Q:APA91bGhn2kP760NOiIen0omFbsXL5Y2rjo8xXMruA3NOB7ejNBWIFW0QvUfVejexO_ZBMppGcoBEFK_1rWeuI2SD2pWWXCkxmPToCh8usIQx9W25krGRGekcbo2WOS27YmazEWQQNgF';

const mysql = require('mysql');
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);
connection.query('USE ' + dbconfig.database);

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

router.get('/check/:token', function (req, res) {
  var options = {
    url: "https://iid.googleapis.com/iid/info/" + req.params.token,
    headers: {
      'Authorization': 'Key=' + serverKey
    },
    qs: {
      details: true
    }
  };

  request(options, function (err, response, body) {
    if (err) errorFunc(res, '', err);
    var json = JSON.parse(response.body);
    console.log(json);
    var keysOfTopics = json.rel.topics.keys;
    res.json({
      "topics": ['hi']
    });
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

  request(options, function (err, response, body) {
    if (err) errorFunc(res, '', err);
    var json = JSON.parse(response.body);
    console.log(json);
    var is_subscribed = json.rel.topics.hasOwnProperty(req.params.topic);
    res.json({
      "is_subscribed": is_subscribed
    });
  });
});

router.post('/add/alarm/company', function (req, res) {
  connection.query('SELECT * FROM ' + dbconfig.company_alarm_table + ' WHERE token = "' + req.body.token + '"AND company_id ="' + req.body.company_id + '"', function (err, row) {
    if (err) errorFunc(res, '', err);
    if (row && row.length) {
      // already subscribed
      return res.sendStatus(200);
    } else {
      // INSERT
      admin.messaging().subscribeToTopic(req.body.token, '/topics/' + req.body.company_id)
        .then(function (response) {
          connection.query("SELECT 1 FROM Information_schema.tables WHERE table_schema = 'soon' AND table_name = '" + req.body.company_id + "'", function (err, row) {
            if (err) errorFunc(res, '', err);
            if (!(row && row.length)) {
              // Create table of company_id
              connection.query("CREATE TABLE `" + req.body.company_id + "` (movie_id INT UNSIGNED PRIMARY KEY)", function (err, result) {
                if (err) errorFunc(res, '', err);
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
                      if (error) errorFunc(res, '', error);
                      json = JSON.parse(body);
                      json.results.forEach(result => {
                        movie_id_array.push([result.id]);
                      });
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
                    if (err) errorFunc(res, '', err);
                    if (movie_id_array.length) {
                      connection.query("INSERT INTO `" + req.body.company_id + "` (movie_id) VALUES ?", [movie_id_array], function (err, result) {
                        if (err) errorFunc(res, '', err);
                        console.log("Number of records inserted: " + result.affectedRows);
                        var insertQuery = "INSERT INTO `" + dbconfig.company_alarm_table + "` (token ,company_id) values (?,?)";
                        connection.query(insertQuery, [req.body.token, req.body.company_id], function (err, rows) {
                          if (err) errorFunc(res, '', err)
                          return res.sendStatus(200);
                        });
                      });
                    } else {
                      var insertQuery = "INSERT INTO `" + dbconfig.company_alarm_table + "` (token ,company_id) values (?,?)";
                      connection.query(insertQuery, [req.body.token, req.body.company_id], function (err, rows) {
                        if (err) errorFunc(res, '', err)
                        return res.sendStatus(200);
                      });
                    }
                  });
              });
            } else {
              var insertQuery = "INSERT INTO `" + dbconfig.company_alarm_table + "` (token ,company_id) values (?,?)";
              connection.query(insertQuery, [req.body.token, req.body.company_id], function (err, rows) {
                if (err) errorFunc(res, '', err)
                return res.sendStatus(200);
              });
            }
          });
        })
        .catch(function (error) {
          console.log('Error subscribing to topic:', error);
          res.sendStatus(404);
        });
    }
  });
});
router.post('/remove/alarm/company', function (req, res) {
  removeCompanyAlarm(req, res, req.body.token, req.body.company_id);
});

function removeCompanyAlarm(req, res, token, topic) {
  connection.query('SELECT * FROM ' + dbconfig.company_alarm_table + ' WHERE token = ? AND company_id = ? ', [token, topic], function (err, row) {
    if (err) errorFunc(res, 'Error select company_alarm:', err);
    if (row && row.length) {
      admin.messaging().unsubscribeFromTopic(token, '/topics/' + topic)
        .then(function (response) {
          var deleteSql = 'DELETE FROM ' + dbconfig.company_alarm_table + ' WHERE token = ? AND company_id = ?';
          connection.query(deleteSql, [token, topic], function (err, result) {
            if (err) throw err;
            var sql = 'SELECT COUNT(*) AS membersCount FROM ' + dbconfig.company_alarm_table + ' WHERE company_id = ?'
            connection.query(sql, [topic], function (err, row) {
              if (err) throw err;
              if (row[0].membersCount <= 0) {
                //DROP TABLE
                var dropSql = "DROP TABLE `" + topic + "`"
                connection.query(dropSql, function (err, result) {
                  if (err) errorFunc(res, '', err);
                  return res.sendStatus(200);
                });
              } else {
                return res.sendStatus(200);
              }
            });
          });
        })
        .catch(function (error) {
          errorFunc(res, 'Error unsubscribing from topic:', error);
        });
    } else {
      // Not Exists
      return res.sendStatus(200);
    }
  });
}

router.post('/reset', function (req, res) {
  connection.query('SELECT company_id FROM ' + dbconfig.company_alarm_table + ' WHERE token = ?', [req.body.token], function (err, rows) {
    if (err) errorFunc(res, 'Error select with token:', err);
    var i = 0;
    const token = req.body.token;
    async.whilst(
      function () {
        return i < rows.length;
      },
      function (next) {
        var topic = rows[i].company_id;
        admin.messaging().unsubscribeFromTopic(token, '/topics/' + topic)
          .then(function (response) {
            var deleteSql = 'DELETE FROM ' + dbconfig.company_alarm_table + ' WHERE token = ? AND company_id = ?';
            connection.query(deleteSql, [token, topic], function (err, result) {
              if (err) throw err;
              var sql = 'SELECT COUNT(*) AS membersCount FROM ' + dbconfig.company_alarm_table + ' WHERE company_id = ?'
              connection.query(sql, [topic], function (err, row) {
                if (err) throw err;
                if (row[0].membersCount <= 0) {
                  //DROP TABLE
                  var dropSql = "DROP TABLE IF EXISTS `" + topic + "`"
                  connection.query(dropSql, function (err, result) {
                    if (err) errorFunc(res, '', err);
                    i++;
                    return next();
                  });
                } else {
                  i++;
                  return next();
                }
              });
            });
          })
          .catch(function (error) {
            errorFunc(res, 'Error unsubscribing from topic:', error);
          });
      },
      function (err) {
        if (err) errorFunc(res, '', err);
        return res.sendStatus(200);
      });
  });
});

function errorFunc(res, logMsg, error) {
  console.log(logMsg, error);
  res.sendStatus(500);
}

module.exports = router;