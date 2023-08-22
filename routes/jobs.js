const cron = require('node-cron');
const FCM = require('fcm-node');
const serverKey = require('../config/firebase').api_key;
const fcm = new FCM(serverKey);
const mysql = require('mysql');
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);
const async = require("async");
const request = require('request');
var admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://soon-79c2e.firebaseio.com'
});

connection.query('USE ' + dbconfig.database);

const _api_key = require('../config/tmdb').api_key;
const _url = 'https://api.themoviedb.org/3';

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

cron.schedule('* * * * *', function () {
  connection.query("SELECT * FROM " + dbconfig.company_alarm_table, function (err, rows, fields) {
    if (err) throw err;
    let i = 0;
    let row;
    async.whilst(function () {
      return i < rows.length;
    }, function (next) {
      console.log("index of rows : " + i);
      row = rows[i];
      let oldPage = 1;
      let nextPage = 2;
      let tmp = new Array();
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
              with_companies: row.company_id,
              'release_date.gte': new Date().yyyymmdd(),
              page: oldPage,
              include_video: 'false',
              region: 'US',
              include_adult: 'true',
              sort_by: 'popularity.desc',
              language: 'ko-KR',
              api_key: _api_key
            }
          };

          request(options, function (err, response, body) {
            if (err) throw err;
            if (response.statusCode == 200) {
              json = JSON.parse(body);
              console.log("current page : " + oldPage);
              json.results.forEach(result => {
                tmp.push([result.id]);
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
          let movie_id_array = new Array();
          connection.query("SELECT * FROM `" + row.company_id + "`", function (err, rows, fields) {
            if (err) throw err;
            rows.forEach(row => {
              movie_id_array.push([row.movie_id]);
            });
            console.log(hasDiff(tmp, movie_id_array));
            if (hasDiff(tmp, movie_id_array)) {
              var options = {
                url: "https://api.themoviedb.org/3/company/" + row.company_id,
                qs: {
                  api_key: _api_key
                }
              }
              request(options, function (err, response, body) {
                if (err) throw err;
                var message = {
                  to: '/topics/' + row.company_id,

                  notification: {
                    title: 'Soon',
                    body: JSON.parse(body).name + "에 새로운 영화가 등록되었습니다."
                  }
                };

                fcm.send(message, function (err, response) {
                  if (err) {
                    console.log("Something has gone wrong!");
                  } else {
                    console.log("Successfully sent with response: ", response);
                  }
                  connection.query("DELETE FROM `" + row.company_id + "`", function (err, result) {
                    if (err) throw err;
                    console.log("Number of records deleted: " + result.affectedRows);
                    connection.query("INSERT INTO `" + row.company_id + "` (movie_id) VALUES ?", [tmp], function (err, result) {
                      if (err) throw err;
                      console.log("Number of records inserted: " + result.affectedRows);
                      i++;
                      next();
                    });
                  });
                });
              });
            }
            else {
              i++;
              next();
            }
          });
        });
    }, function (err) {
      if (err) throw err;
      console.log("Calculate Difference of Movie Tables : Complete!");
    });
  });
}).start();

cron.schedule('* * * * *', function () {
  connection.query('SELECT token FROM '+ dbconfig.company_alarm_table+' GROUP BY token', function (err, rows) {
    if(err) throw err;
    var i = 0;
    async.whilst(
      function () {
        return i < rows.length;
      },
      function (next) {
        const row = rows[i];
        console.log(row.token);
        var options = {
          url: "https://iid.googleapis.com/iid/info/" + row.token,
          headers: {
            'Authorization': 'Key=' + serverKey
          },
          qs: {
            details: true
          }
        };

        request(options, function (err, response, body) {
          var body = JSON.parse(body);
          if (body.error && body.error == 'InvalidToken') {
            // Invalid Token => Need to be Reset
            connection.query('SELECT company_id FROM ' + dbconfig.company_alarm_table + ' WHERE token = ?', [row.token], function (err, rows) {
              if (err) console.log('Error select with token:', err);
              var j = 0;
              async.whilst(
                function () {
                  return j < rows.length;
                },
                function (next) {
                  var topic = rows[j].company_id;
                  admin.messaging().unsubscribeFromTopic(row.token, '/topics/' + topic)
                    .then(function (response) {
                      var deleteSql = 'DELETE FROM ' + dbconfig.company_alarm_table + ' WHERE token = ? AND company_id = ?';
                      connection.query(deleteSql, [row.token, topic], function (err, result) {
                        if (err) console.log(err);;
                        var sql = 'SELECT COUNT(*) AS membersCount FROM ' + dbconfig.company_alarm_table + ' WHERE company_id = ?'
                        connection.query(sql, [topic], function (err, row) {
                          if (err) console.log(err);;
                          if (row[0].membersCount <= 0) {
                            //DROP TABLE
                            var dropSql = "DROP TABLE IF EXISTS `" + topic + "`"
                            connection.query(dropSql, function (err, result) {
                              if (err) console.log('', err);
                              j++;
                              return next();
                            });
                          } else {
                            j++;
                            return next();
                          }
                        });
                      });
                    })
                    .catch(function (error) {
                      console.log('Error unsubscribing from topic:', error);
                    });
                },
                function (err) {
                  if (err) console.log('', err);
                  i++;
                  next();
                });
            });
          } else { // Valid Token
            i++;
            next();
          }
        });
      },
      function (err) {
        //totally done!
        if (err) console.log(err);
        console.log('Totally Done!');
      }
    );
  });
}).start();

function hasDiff(a1, a2) {
  var a = [], diff = [];

  for (var i = 0; i < a1.length; i++) {
    a[a1[i]] = true;
  }

  for (var i = 0; i < a2.length; i++) {
    if (a[a2[i]]) {
      delete a[a2[i]];
    } else {
      a[a2[i]] = true;
    }
  }

  for (var k in a) {
    diff.push(k);
  }

  return diff.length;
}


cron.schedule('0 0 1 * *', function () {
  var message = {
    to: '/topics/all',

    notification: {
      title: 'Soon',
      body: '이번달에 무슨 영화가 개봉하는지 확인하세요'
    }
  };

  fcm.send(message, function (err, response) {
    if (err) {
      console.log("Something has gone wrong!");
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });
}).start();
