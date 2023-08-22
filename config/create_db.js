const mysql = require('mysql');
const dbconfig = require('./database');

const connection = mysql.createConnection(dbconfig.connection);

connection.query("CREATE DATABASE IF NOT EXISTS " + dbconfig.database + ";");

connection.query("USE " + dbconfig.database);

connection.query('CREATE TABLE IF NOT EXISTS ' + dbconfig.company_alarm_table + '(token VARCHAR(300) NOT NULL, company_id INT UNSIGNED NOT NULL, PRIMARY KEY(token, company_id));', function (err, row){
        if (err){
                console.log(err);
        }
        else{
                console.log(row);
        }
});

connection.end();
