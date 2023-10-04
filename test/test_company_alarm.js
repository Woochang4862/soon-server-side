const request = require('request');
const _api_key = require('../config/tmdb').api_key
const async = require('async');
const mysql = require('mysql');
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

const _url = 'https://api.themoviedb.org/3';

Date.prototype.yyyymmdd = function () {
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
    ].join('-');
};

var sql = "CREATE TABLE IF NOT EXISTS `tmp` (movie_id INT UNSIGNED PRIMARY KEY); DELETE FROM `tmp`;";
connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
    connection.query("SELECT * FROM " + dbconfig.company_alarm_table, function (err, results, fields) {
        if (err) throw err;
        results.forEach(result => {
            console.log(result.company_id);

            let oldPage = 1;
            let nextPage = 2;
            let json;
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
                            with_companies: result.company_id,
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
                    request(options, function (error, response, body) {
                        if (error) throw error;
                        if (response.statusCode == 200) {
                            console.log(oldPage);
                            json = JSON.parse(body);
                            json.results.forEach(result => {
                                movie_id_array.push([result.id])
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
                    if (err) throw err;
                    connection.query("INSERT INTO `tmp` (movie_id) VALUES ?", [movie_id_array], function (err, result) {
                        if (err) throw err;
                        console.log("Number of records inserted: " + result.affectedRows);

                    });
                });
        });
    });
});