const mysql = require('mysql');
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);
connection.query('USE ' + dbconfig.database);
const request = require('request');
const serverKey = require('../conifg/firebase').api_key;
const async = require("async");
var admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://soon-79c2e.firebaseio.com'
});

connection.query('SELECT MIN(id), token FROM company_alarm GROUP BY token', function (err, rows) {
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
