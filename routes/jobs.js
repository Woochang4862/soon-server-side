import cron from 'node-cron';
import serverKey from '../config/firebase.js';
import mysql from 'mysql2/promise';
import dbconfig from '../config/database.js';
import serviceAccount from '../public/soon-79c2e-firebase-adminsdk-h7o9r-dc2b66a1c8.json' assert {type: 'json'};
import api_key from '../config/tmdb.js';
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://soon-79c2e.firebaseio.com'
});
//const fcm = new FCM(serverKey);
const connection = mysql.createConnection(dbconfig.connection);

const baseUrl = 'https://api.themoviedb.org/3';

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

/**
 * 제작사 테이블 변경사항 체크
 * 현재 있는 제작사 테이블에 대해서
 *  테이블 내 제작사 id 와 api 서버 내 제작사 id 를 비교
 */
cron.schedule('* * * * *', async function () {
  let startTime = Date.now();
  const connection = await mysql.createConnection(dbconfig.connection);
  let response;
  try {
    response = await connection.query("SELECT * FROM " + dbconfig.company_alarm_table);
    console.log("response: " + JSON.stringify(response));

    response = await connection.query("SELECT table_name FROM Information_schema.tables WHERE table_schema = '" + dbconfig.connection.database + "' AND table_name <> '" + dbconfig.company_alarm_table + "'");
    console.log("response: " + JSON.stringify(response)); // [[{"TABLE_NAME":"420"}],[...]]
    let [rows] = response;
    console.log(rows);
    for (let { TABLE_NAME } of rows) { // 대소문자 중요 table_name (x)
      response = await connection.beginTransaction();
      console.log("response: " + JSON.stringify(response));

      let currentPage = 1;
      let nextPage = 2;
      let movie_id_array_from_api = new Array();

      while (currentPage < nextPage) {
        const url = baseUrl + '/discover/movie?' + new URLSearchParams({
          with_companies: TABLE_NAME,
          'release_date.gte': new Date().yyyymmdd(),
          page: currentPage,
          include_video: 'false',
          region: 'US',
          include_adult: 'false',
          sort_by: 'popularity.desc',
          language: 'ko-KR',
          api_key
        });
        const response = await fetch(url);
        const data = await response.json();

        movie_id_array_from_api = movie_id_array_from_api.concat(data.results.map(function (result) {
          return result.id
        }));

        if (data.total_pages > currentPage) {
          nextPage++;
        }
        currentPage++;
      }
      console.log('movie_id_array: ' + JSON.stringify(movie_id_array_from_api));

      response = await connection.query("SELECT movie_id FROM `" + TABLE_NAME + "`");
      console.log("response: " + JSON.stringify(response)); //[[{"movie_id":533535},{"movie_id":609681},{"movie_id":617126},{"movie_id":617127},{"movie_id":822119},{"movie_id":986056},{"movie_id":1003596},{"movie_id":1003598},{"movie_id":1165487},{"movie_id":1165500}],[{"_buf":{"type":"Buffer","data":[1,0,0,1,1,52,0,0,2,3,100,101,102,8,97,108,97,114,109,95,100,98,3,52,50,48,3,52,50,48,8,109,111,118,105,101,95,105,100,8,109,111,118,105,101,95,105,100,12,63,0,10,0,0,0,3,35,80,0,0,0,5,0,0,3,254,0,0,3,0,7,0,0,4,6,53,51,51,53,51,53,7,0,0,5,6,54,48,57,54,56,49,7,0,0,6,6,54,49,55,49,50,54,7,0,0,7,6,54,49,55,49,50,55,7,0,0,8,6,56,50,50,49,49,57,7,0,0,9,6,57,56,54,48,53,54,8,0,0,10,7,49,48,48,51,53,57,54,8,0,0,11,7,49,48,48,51,53,57,56,8,0,0,12,7,49,49,54,53,52,56,55,8,0,0,13,7,49,49,54,53,53,48,48,5,0,0,14,254,0,0,3,0]},"_clientEncoding":"utf8","_catalogLength":3,"_catalogStart":10,"_schemaLength":8,"_schemaStart":14,"_tableLength":3,"_tableStart":23,"_orgTableLength":3,"_orgTableStart":27,"_orgNameLength":8,"_orgNameStart":40,"characterSet":63,"encoding":"binary","name":"movie_id","columnLength":10,"columnType":3,"type":3,"flags":20515,"decimals":0}]]
      let movie_id_array_from_table = response[0].map(function (e) {
        return e.movie_id
      });

      if (hasDiff(movie_id_array_from_table, movie_id_array_from_api)) {
        response = await fetch(baseUrl + "/company/" + TABLE_NAME+"?" + new URLSearchParams({
          api_key
        }));
        let company = await response.json();
        let message = {
          topic: TABLE_NAME,
          data: {
            company:JSON.stringify(company),
            title: 'Soon',
            body: company.name + "의 영화 리스트가 수정되었습니다."
          }
        };
        response = await admin.messaging().send(message);
        console.log("response: " + JSON.stringify(response));

        movie_id_array_from_api = movie_id_array_from_api.map(function (e) {
          return [e];
        });

        response = await connection.query(`DELETE FROM \`${TABLE_NAME}\``);
        console.log("response: " + JSON.stringify(response));

        response = await connection.query(`INSERT INTO \`${TABLE_NAME}\` (movie_id) VALUES ?`, [movie_id_array_from_api]);
        console.log("response: " + JSON.stringify(response));

        response = await connection.commit();
        console.log("response: " + JSON.stringify(response));
      }
    }
  } catch (error) {
    console.log(error);
    response = await connection.rollback();
    console.log("response: " + JSON.stringify(response));
  }
  console.log(`Calculate Difference of Movie Tables : Complete! (Excutation Time:${Date.now() - startTime}ms)`);

}).start();

/**
 * Invalid Token Unsubscribe 시키기
 * 저장된 토큰에 대해서 유효한 토큰인지 판단
 * 만약 유효하지 않은 토큰이라면 테이블에서 제외하는 과정 (각 제작사에서 모두 Unsubscribe & 테이블에서 삭제)
 */
cron.schedule('* * * * *', async function () {
  const connection = await mysql.createConnection(dbconfig.connection);
  let response;
  try {
    response = await connection.query('SELECT token FROM ' + dbconfig.company_alarm_table + ' GROUP BY token'); // token 을 unique 하게 뽑아냄
    console.log("response: " + JSON.stringify(response));

    for (let {token} of response[0]){
      response = await fetch("https://iid.googleapis.com/iid/info/" + token+"?" + 
      new URLSearchParams({
        details:true
      }),
      {
        headers: {
          'Authorization': 'Key=' + serverKey
        }
      });
      let result = await response.json();
      console.log(result);
    }
  } catch (error) {
    console.log(error);
    response = await connection.rollback();
    console.log("response: " + JSON.stringify(response));
  }
  // connection.query('SELECT token FROM ' + dbconfig.company_alarm_table + ' GROUP BY token', function (err, rows) {
  //   if (err) throw err;
  //   var i = 0;
  //   async.whilst(
  //     function () {
  //       return i < rows.length;
  //     },
  //     function (next) {
  //       const row = rows[i];
  //       console.log(row.token);
  //       var options = {
  //         url: "https://iid.googleapis.com/iid/info/" + row.token,
  //         headers: {
  //           'Authorization': 'Key=' + serverKey
  //         },
  //         qs: {
  //           details: true
  //         }
  //       };

  //       request(options, function (err, response, body) {
  //         var body = JSON.parse(body);
  //         if (body.error && body.error == 'InvalidToken') {
  //           // Invalid Token => Need to be Reset
  //           connection.query('SELECT company_id FROM ' + dbconfig.company_alarm_table + ' WHERE token = ?', [row.token], function (err, rows) {
  //             if (err) console.log('Error select with token:', err);
  //             var j = 0;
  //             async.whilst(
  //               function () {
  //                 return j < rows.length;
  //               },
  //               function (next) {
  //                 var topic = rows[j].company_id;
  //                 admin.messaging().unsubscribeFromTopic(row.token, '/topics/' + topic)
  //                   .then(function (response) {
  //                     var deleteSql = 'DELETE FROM ' + dbconfig.company_alarm_table + ' WHERE token = ? AND company_id = ?';
  //                     connection.query(deleteSql, [row.token, topic], function (err, result) {
  //                       if (err) console.log(err);;
  //                       var sql = 'SELECT COUNT(*) AS membersCount FROM ' + dbconfig.company_alarm_table + ' WHERE company_id = ?'
  //                       connection.query(sql, [topic], function (err, row) {
  //                         if (err) console.log(err);;
  //                         if (row[0].membersCount <= 0) {
  //                           //DROP TABLE
  //                           var dropSql = "DROP TABLE IF EXISTS `" + topic + "`"
  //                           connection.query(dropSql, function (err, result) {
  //                             if (err) console.log('', err);
  //                             j++;
  //                             return next();
  //                           });
  //                         } else {
  //                           j++;
  //                           return next();
  //                         }
  //                       });
  //                     });
  //                   })
  //                   .catch(function (error) {
  //                     console.log('Error unsubscribing from topic:', error);
  //                   });
  //               },
  //               function (err) {
  //                 if (err) console.log('', err);
  //                 i++;
  //                 next();
  //               });
  //           });
  //         } else { // Valid Token
  //           i++;
  //           next();
  //         }
  //       });
  //     },
  //     function (err) {
  //       //totally done!
  //       if (err) console.log(err);
  //       console.log('Totally Done!');
  //     }
  //   );
  // });
}).start();

/**
 * 만약 차이가 있을 시 1 이상의 값이 
 * 없을시 0이 반환된다.
 * @param {Array} a1 비교할 어레이 1
 * @param {Array} a2 비교할 어레이 2
 * @returns 합집합에서 교집합을 뺐을 때 집합의 원소 개수
 */
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
