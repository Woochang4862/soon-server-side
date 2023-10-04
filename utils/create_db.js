import mysql from 'mysql2/promise';
import dbconfig from '../config/database.js'

export async function createTable() {
        const connection = await mysql.createConnection(dbconfig.connection);
        var response = await connection.query("CREATE DATABASE IF NOT EXISTS " + dbconfig.database + ";");
        console.log("response : "+JSON.stringify(response));

        response = await connection.query('CREATE TABLE IF NOT EXISTS ' + dbconfig.company_alarm_table + '(token VARCHAR(300) NOT NULL, company_id INT UNSIGNED NOT NULL, PRIMARY KEY(token, company_id));');  
        console.log("response : "+JSON.stringify(response));
};



