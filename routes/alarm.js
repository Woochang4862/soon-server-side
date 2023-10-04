import express from 'express';
import fetch from 'node-fetch';
import api_key from '../config/tmdb.js';
import serverKey from '../config/firebase.js';
import serviceAccount from '../public/soon-79c2e-firebase-adminsdk-h7o9r-dc2b66a1c8.json' assert {type: 'json'};
import admin from 'firebase-admin';
import mysql from 'mysql2/promise';
import dbconfig from '../config/database.js';

const router = express.Router();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://soon-79c2e.firebaseio.com"
});

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

router.get('/check/:token', async function (req, res) {
  let url = "https://iid.googleapis.com/iid/info/" + req.params.token + "?" + new URLSearchParams({ details: true });
  let response;
  let data;
  try {
    response = await fetch(url, {
      headers: {
        'Authorization': 'Key=' + serverKey
      }
    });
    data = await response.json();
    console.log(JSON.stringify(data));
    if (data.error == "InvalidToken") { // {"error":"InvalidToken"}
      return res.sendStatus(400);
    }
    if (!data.hasOwnProperty('rel')) {
      //{"applicationVersion":"42","gmiRegistrationId":"66c1b25a87b84b50a3cbb298ce675865","application":"com.lusle.android.soon","scope":"*","authorizedEntity":"151426917188","appSigner":"6db88e61793cd4b27014eeab44ac59abd33fbed3","platform":"ANDROID"}
      // all topic까지 사라졌을 때 이유는 모르겠지만
      return res.status(400).json({ "error": "This token must subscribe 'all' topic" })
    }
    var keysOfTopics = Object.keys(data.rel.topics);
    return res.status(200).json({
      "topics": keysOfTopics
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

router.get('/check/:token/subscribe/:topic', async function (req, res) {
  let url = "https://iid.googleapis.com/iid/info/" + req.params.token + "?" + new URLSearchParams({ details: true });
  let response;
  let data;
  try {
    response = await fetch(url, {
      headers: {
        'Authorization': 'Key=' + serverKey
      }
    });
    data = await response.json();
    console.log(JSON.stringify(data));
    if (data.error == "InvalidToken") { // {"error":"InvalidToken"}
      return res.sendStatus(400);
    }
    if (!data.hasOwnProperty('rel')) {
      //{"applicationVersion":"42","gmiRegistrationId":"66c1b25a87b84b50a3cbb298ce675865","application":"com.lusle.android.soon","scope":"*","authorizedEntity":"151426917188","appSigner":"6db88e61793cd4b27014eeab44ac59abd33fbed3","platform":"ANDROID"}
      // all topic까지 사라졌을 때 이유는 모르겠지만
      return res.status(400).json({ "error": "This token must subscribe 'all' topic" })
    }
    var is_subscribed = data.rel.topics.hasOwnProperty(req.params.topic);
    res.json({
      "is_subscribed": is_subscribed
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

router.post('/add/alarm/company', async function (req, res) {
  /*
    구독
    알람 테이블에 추가
    해당 제작사 테이블 확인
  */
  const connection = await mysql.createConnection(dbconfig.connection);
  let response;
  try {
    response = await admin.messaging().subscribeToTopic(req.body.token, '/topics/' + req.body.company_id)
    console.log("response: " + JSON.stringify(response));
    // 성공시 {"successCount":1,"failureCount":0,"errors":[]}
    // 실패시 {"successCount":0,"failureCount":1,"errors":[{"index":0,"error":{"code":"messaging/invalid-registration-token","message":"Invalid registration token provided. Make sure it matches the registration token the client app receives from registering with FCM."}}]}
    // 여러개 보냈을 때 {"successCount":1,"failureCount":1,"errors":[{"index":1,"error":{"code":"messaging/invalid-registration-token","message":"Invalid registration token provided. Make sure it matches the registration token the client app receives from registering with FCM."}}]}
    let { failureCount, errors } = response;
    if (failureCount > 0 && errors) {
      console.log(errors);
      return res.sendStatus(400); // Invalid Request
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }

  try {
    connection.beginTransaction();

    response = await connection.query("INSERT IGNORE INTO `" + dbconfig.company_alarm_table + "` (token ,company_id) values (?,?)", [req.body.token, req.body.company_id]);
    console.log("response: " + JSON.stringify(response)); //[{"fieldCount":0,"affectedRows":0,"insertId":0,"info":"","serverStatus":2,"warningStatus":1,"changedRows":0},null]

    response = await connection.query("SELECT table_name FROM Information_schema.tables WHERE table_schema = '" + dbconfig.connection.database + "' AND table_name = '" + req.body.company_id + "'");
    console.log("response: " + JSON.stringify(response)); // [[{"TABLE_NAME":"420"}],[...]]
    let [rows] = response;
    if (!rows.length) {
      let currentPage = 1;
      let nextPage = 2;
      let movie_id_array = new Array();

      while (currentPage < nextPage) {
        const url = 'https://api.themoviedb.org/3/discover/movie?' + new URLSearchParams({
          with_companies: req.body.company_id,
          'release_date.gte': new Date().yyyymmdd(),
          page: currentPage,
          include_video: 'false',
          region: 'US',
          include_adult: 'false',
          sort_by: 'popularity.desc',
          language: 'ko-KR',
          api_key
        })
        const response = await fetch(url);
        const data = await response.json();

        console.log(data);

        movie_id_array = movie_id_array.concat(data.results.map(function (result) {
          return [result.id]
        }));

        if (data.total_pages > currentPage) {
          nextPage++;
        }
        currentPage++;
      }
      console.log('movie_id_array: ' + JSON.stringify(movie_id_array));

      response = await connection.query("CREATE TABLE `" + req.body.company_id + "` (movie_id INT UNSIGNED PRIMARY KEY)");
      console.log("response: " + JSON.stringify(response)); // [{"fieldCount":0,"affectedRows":0,"insertId":0,"info":"","serverStatus":2,"warningStatus":1,"changedRows":0},null]

      if (movie_id_array.length) {
        response = await connection.query("INSERT INTO `" + req.body.company_id + "` (movie_id) VALUES ?", [movie_id_array]);
        console.log("response: " + JSON.stringify(response)); // [{"fieldCount":0,"affectedRows":10,"insertId":0,"info":"Records: 10  Duplicates: 0  Warnings: 0","serverStatus":2,"warningStatus":0,"changedRows":0},null]
      }

    }
    connection.commit();
  } catch (error) {
    console.log(error);

    response = await connection.rollback();
    console.log("rollback response: " + JSON.stringify(response));

    response = await admin.messaging().unsubscribeFromTopic(req.body.token, '/topics/' + req.body.company_id)
    console.log("response: " + JSON.stringify(response));

    return res.sendStatus(500);
  }

  res.sendStatus(200);
});

router.post('/remove/alarm/company', async function (req, res) {
  /*
    구독
    알람 테이블에 제거
    해당 제작사 테이블 확인
  */
  const connection = await mysql.createConnection(dbconfig.connection);
  let response;
  try {
    response = await admin.messaging().unsubscribeFromTopic(req.body.token, '/topics/' + req.body.company_id)
    console.log("response: " + JSON.stringify(response));

    let { failureCount, errors } = response;
    if (failureCount > 0 && errors) {
      console.log(errors);
      return res.sendStatus(400);
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }

  try {
    connection.beginTransaction();

    response = await connection.query('DELETE FROM ' + dbconfig.company_alarm_table + ' WHERE token = ? AND company_id = ?', [req.body.token, req.body.company_id]);
    console.log("response: " + JSON.stringify(response)); //[{"fieldCount":0,"affectedRows":0,"insertId":0,"info":"","serverStatus":2,"warningStatus":1,"changedRows":0},null]

    response = await connection.query('SELECT COUNT(*) AS count FROM ' + dbconfig.company_alarm_table + ' GROUP BY company_id HAVING company_id = ?', [req.body.company_id]);
    console.log("response: " + JSON.stringify(response)); // [[{"COUNT(*)":2}],[{"_buf":{"type":"Buffer","data":[1,0,0,1,1,30,0,0,2,3,100,101,102,0,0,0,8,67,79,85,78,84,40,42,41,0,12,63,0,21,0,0,0,8,1,0,0,0,0,5,0,0,3,254,0,0,3,0,2,0,0,4,1,50,5,0,0,5,254,0,0,3,0]},"_clientEncoding":"utf8","_catalogLength":3,"_catalogStart":10,"_schemaLength":0,"_schemaStart":14,"_tableLength":0,"_tableStart":15,"_orgTableLength":0,"_orgTableStart":16,"_orgNameLength":0,"_orgNameStart":26,"characterSet":63,"encoding":"binary","name":"COUNT(*)","columnLength":21,"columnType":8,"type":8,"flags":1,"decimals":0}]
    let [{ count }] = response;

    if (count) { }
    else {
      response = await connection.query("DROP TABLE IF EXISTS `" + req.body.company_id + "`");
      console.log("response: " + JSON.stringify(response));
    }

    connection.commit();
  } catch (error) {
    console.log(error);

    response = await connection.rollback();
    console.log("response: " + JSON.stringify(response));

    response = await admin.messaging().subscribeToTopic(req.body.token, '/topics/' + req.body.company_id)
    console.log("response: " + JSON.stringify(response));

    return res.sendStatus(500);
  }

  res.sendStatus(200);
});

router.post('/reset', async function (req, res) {
  /*
  테이블 조회
  테이블에 등록된 모든 제작사 대상으로 구독 해지
  테이블과 Firebase Message Topic 동기화
  */
  let connection = await mysql.createConnection(dbconfig.connection);
  let response;
  let company_ids;
  try {
    response = await connection.query("SELECT company_id FROM " + dbconfig.company_alarm_table + " WHERE token=?", [req.body.token]);
    [company_ids] = response;
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
  console.log(JSON.stringify(company_ids));
  for (let { company_id } of company_ids) {
    try {
      response = await admin.messaging().unsubscribeFromTopic(req.body.token, "/topics/" + company_id);
      console.log("response: " + JSON.stringify(response));

      let { failureCount, errors } = response;
      if (failureCount > 0 && errors) {
        console.log(errors);
        return res.sendStatus(400);
      }
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }

    try {
      response = await connection.beginTransaction();
      console.log("response: " + JSON.stringify(response));

      response = await connection.query('DELETE FROM ' + dbconfig.company_alarm_table + ' WHERE token = ? AND company_id = ?', [req.body.token, company_id]);
      console.log("response: " + JSON.stringify(response));

      response = await connection.query('SELECT COUNT(*) AS count FROM ' + dbconfig.company_alarm_table + ' GROUP BY company_id HAVING company_id = ?', [company_id]);
      console.log("response: " + JSON.stringify(response));
      let [{ count }] = response;

      if (count) { }
      else {
        response = await connection.query("DROP TABLE IF EXISTS `" + company_id + "`");
        console.log("response: " + JSON.stringify(response));
      }

      response = await connection.commit()
    } catch (error) {
      console.log(error);
      response = await connection.rollback();
      console.log("rollback response: " + JSON.stringify(response));

      response = await admin.messaging().subscribeToTopic(req.body.token, '/topics/' + req.body.company_id)
      console.log("response: " + JSON.stringify(response));

      return res.sendStatus(500);
    }
  }

  //여기서부터는 Firebase Message Topic 에 등록된 것이 all 밖에 없어야 함
  let url = "https://iid.googleapis.com/iid/info/" + req.body.token + "?" + new URLSearchParams({ details: true });
  let data;
  try {
    response = await fetch(url, {
      headers: {
        'Authorization': 'Key=' + serverKey
      }
    });
    data = await response.json();
    if (!data.hasOwnProperty('rel')) {
      //{"applicationVersion":"42","gmiRegistrationId":"66c1b25a87b84b50a3cbb298ce675865","application":"com.lusle.android.soon","scope":"*","authorizedEntity":"151426917188","appSigner":"6db88e61793cd4b27014eeab44ac59abd33fbed3","platform":"ANDROID"}
      // all topic까지 사라졌을 때
      return res.status(400).json({ "error": "This token must subscribe 'all' topic" })
    }
    var keysOfTopics = Object.keys(data.rel.topics);
    for (let topic of keysOfTopics) {
      if (topic == "all") continue;
      response = await admin.messaging().unsubscribeFromTopic(req.body.token, "/topics/" + topic);
      console.log("response: " + JSON.stringify(response));

      let { failureCount, errors } = response;
      if (failureCount > 0 && errors) {
        console.log(errors);
        return res.sendStatus(400);
      }
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }

  res.sendStatus(200);
});

router.post('/fix', async function (req, res) {
  /*
  token 의 topics 유효성 검사 : all 있어야 됨
  alarm_table - topics topic으로 추가
  topics - alarm_table topic에서 제거
  */
  res.sendStatus(200);
});

// firebase function
// check validation of token
// get topics that user(token) subscribed
// subscribe to topic
// unsubscribe to topic

// mysql function
// add alarm to alarm table
// remove alarm from alarm table

export default router;
