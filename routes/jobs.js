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

const baseUrl = 'https://api.themoviedb.org/3';

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

cron.schedule('* * * * *', async function () {
  let connection = await mysql.createConnection(dbconfig.connection);
  await unsubscribeInvalidToken(connection);
  await checkDifferenceOfCompanyTable(connection);
  // TODO: 특정 company_id 가 company alarm table에 있는데 `company_id`테이블이 없을때 만들어 준다
  await connection.end()
}).start();

/**
 * 제작사 테이블 변경사항 체크
 * 현재 있는 제작사 테이블에 대해서
 *  테이블 내 제작사 id 와 api 서버 내 제작사 id 를 비교
 */
const checkDifferenceOfCompanyTable = async function (connection) {
  let startTime = Date.now();
  let response;
  try {
    response = await connection.query("SELECT * FROM " + dbconfig.company_alarm_table);
    console.log("response of select from company alarm table: " + JSON.stringify(response[0]));

    response = await connection.query("SELECT table_name FROM Information_schema.tables WHERE table_schema = '" + dbconfig.connection.database + "' AND table_name <> '" + dbconfig.company_alarm_table + "'");
    console.log("response of select all company table: " + JSON.stringify(response[0])); // [[{"TABLE_NAME":"420"}],[...]]
    let [rows] = response;
    console.log(rows);
    for (let { TABLE_NAME } of rows) { // 대소문자 중요 table_name (x)
      response = await connection.beginTransaction();
      console.log("response of beginTransaction: " + JSON.stringify(response));

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
      console.log('current movie_id_array from api : ' + JSON.stringify(movie_id_array_from_api));

      response = await connection.query("SELECT movie_id FROM `" + TABLE_NAME + "`");
      console.log("response of select from `"+TABLE_NAME+"`: " + JSON.stringify(response[0])); //[[{"movie_id":533535},{"movie_id":609681},{"movie_id":617126},{"movie_id":617127},{"movie_id":822119},{"movie_id":986056},{"movie_id":1003596},{"movie_id":1003598},{"movie_id":1165487},{"movie_id":1165500}],[{"_buf":{"type":"Buffer","data":[1,0,0,1,1,52,0,0,2,3,100,101,102,8,97,108,97,114,109,95,100,98,3,52,50,48,3,52,50,48,8,109,111,118,105,101,95,105,100,8,109,111,118,105,101,95,105,100,12,63,0,10,0,0,0,3,35,80,0,0,0,5,0,0,3,254,0,0,3,0,7,0,0,4,6,53,51,51,53,51,53,7,0,0,5,6,54,48,57,54,56,49,7,0,0,6,6,54,49,55,49,50,54,7,0,0,7,6,54,49,55,49,50,55,7,0,0,8,6,56,50,50,49,49,57,7,0,0,9,6,57,56,54,48,53,54,8,0,0,10,7,49,48,48,51,53,57,54,8,0,0,11,7,49,48,48,51,53,57,56,8,0,0,12,7,49,49,54,53,52,56,55,8,0,0,13,7,49,49,54,53,53,48,48,5,0,0,14,254,0,0,3,0]},"_clientEncoding":"utf8","_catalogLength":3,"_catalogStart":10,"_schemaLength":8,"_schemaStart":14,"_tableLength":3,"_tableStart":23,"_orgTableLength":3,"_orgTableStart":27,"_orgNameLength":8,"_orgNameStart":40,"characterSet":63,"encoding":"binary","name":"movie_id","columnLength":10,"columnType":3,"type":3,"flags":20515,"decimals":0}]]
      let movie_id_array_from_table = response[0].map(function (e) {
        return e.movie_id
      });
      const diff = getDiff(movie_id_array_from_table, movie_id_array_from_api)
      if (diff.arrToAdd.length != 0) {
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
        console.log("response of FCM: " + JSON.stringify(response));

        const arrToAdd = diff.arrToAdd.map(function (e) {
          return [e];
        });

        // response = await connection.query(`DELETE FROM \`${TABLE_NAME}\``);
        // console.log("response: " + JSON.stringify(response));

        response = await connection.query(`INSERT INTO \`${TABLE_NAME}\` (movie_id) VALUES ?`, [arrToAdd]);
        console.log("response of add differences : " + JSON.stringify(response));   
      }
      if (diff.arrToDelete.length != 0) {
        const arrToDelete = diff.arrToDelete.map(function (e) {
          return [e];
        });
        response = await connection.query(`DELETE FROM \`${TABLE_NAME}\` WHERE (movie_id) IN (?)`, [arrToDelete]);
        console.log("response of delete differences : " + JSON.stringify(response));
      }
      response = await connection.commit();
      console.log("response of commit: " + JSON.stringify(response));
    }
  } catch (error) {
    console.log(error);
    response = await connection.rollback();
    console.log("response: " + JSON.stringify(response));
  }
  console.log(`Calculate Difference of Movie Tables : Complete! (Excutation Time:${Date.now() - startTime}ms)`);
};

/**
 * Invalid Token Unsubscribe 시키기
 * 저장된 토큰에 대해서 유효한 토큰인지 판단
 * 만약 유효하지 않은 토큰이라면 테이블에서 제외하는 과정 (각 제작사에서 모두 Unsubscribe & 테이블에서 삭제)
 */
const unsubscribeInvalidToken = async function (connection) {
  let startTime = Date.now();
  let response;
  try {
    response = await connection.query('SELECT token FROM ' + dbconfig.company_alarm_table + ' GROUP BY token'); // token 을 unique 하게 뽑아냄
    console.log("response: " + JSON.stringify(response[0]));

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
      console.log("response: "+result);
      if (result.error && result.error == "InvalidToken") {
        /**
         * company_alarm_table 에서 token 인 행에 대해서 company_id 가져오기
         * company_id 에 대해서 
         *  table 삭제
         *  unsubscribe to topic
         * company_alarm_table 에서 token 행 삭제
         */
        response = await connection.query('SELECT company_id FROM ' + dbconfig.company_alarm_table + ' WHERE token="'+token+'"');
        console.log("response of select company_id from company alarm table where token = "+token+" : "+response[0]);
        
        for (let {company_id} of response[0]) {
          response = await connection.query("DROP TABLE IF EXISTS `" + company_id + "`");
          console.log(response);

          response = await admin.messaging().unsubscribeFromTopic(token, '/topics/' + company_id);
          console.log('response: '+response);
        }

        response = await connection.query('DELETE FROM ' + dbconfig.company_alarm_table + ' WHERE token = ?',[token,]);
        console.log("response: "+response);


      }
    }
  } catch (error) {
    console.log(error);
    response = await connection.rollback();
    console.log("response: " + JSON.stringify(response));
  }
  console.log(`Cleaning Invalid Row, Token, Table : Complete! (Excutation Time:${Date.now() - startTime}ms)`);
}

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

  for (var k in a) { // 빈 아이템 제거 ex) [ <1 empty item>, 1, 2 ]
    diff.push(k);
  }

  return diff.length;
}

/**
 * Array를 비교하여 기존 어레이에 추가할 어레이와 삭제할 어레이를 결과로 반환하는 함수
 * @param {Array} a1 기존 어레이 N
 * @param {Array} a2 비교 어레이 M
 * @returns {Object} result arrToDelete:삭제할 Array, arrToAdd:추가할 Array
 * Time Complexity : O(max(N,M))
 */
function getDiff(a1, a2) {
  var _arrToDelete = [], arrToAdd = [];

  for (var i = 0; i < a1.length; i++) {
      _arrToDelete[a1[i]] = a1[i];
  }

  for (var i = 0; i < a2.length; i++) {
      if (_arrToDelete[a2[i]] != undefined) {
          delete _arrToDelete[a2[i]];
      } else {
          arrToAdd.push(a2[i]);
      }
  }

  var arrToDelete = [];
  for (var id of _arrToDelete) {
      if (id)
          arrToDelete.push(id);
  }

  return { arrToDelete, arrToAdd };
}


cron.schedule('0 0 1 * *', async function () {
  let message = {
    topic: 'all',
    data: {
      title: 'Soon',
      body: '이번달에 무슨 영화가 개봉하는지 확인해보세요!'
    }
  };
  try {
    response = await admin.messaging().send(message);
    console.log("Successfully sent with response: ", response);
  } catch (error) {
    console.log("Something has gone wrong!\n"+err);
  }
}).start();
