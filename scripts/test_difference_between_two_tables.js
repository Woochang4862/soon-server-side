const mysql = require('mysql');
const dbconfig = require('../config/database');
const connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

var sql = "SELECT * FROM tmp WHERE movie_id not in (select movie_id from `420`);"
connection.query(sql)