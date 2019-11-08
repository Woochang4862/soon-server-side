var cron = require('node-cron');
//var cronJob = require('cron').CronJob;
//const request = require('request');
//const redis = require('redis');
const FCM = require('fcm-node');
const serverKey = 'AAAAI0G_Y0Q:APA91bGhn2kP760NOiIen0omFbsXL5Y2rjo8xXMruA3NOB7ejNBWIFW0QvUfVejexO_ZBMppGcoBEFK_1rWeuI2SD2pWWXCkxmPToCh8usIQx9W25krGRGekcbo2WOS27YmazEWQQNgF';
const fcm = new FCM(serverKey);

//const client = redis.createClient(6379);

/*client.on('error', (err) => {
  console.log("Error " + err);
});*/

const _api_key = 'dacdeb969b934abef7e5002b69d6c9ae';
const _url = 'https://api.themoviedb.org/3';

/*cron.schedule('0 * * * *', function () {
  var options = {
    method: 'GET',
    url: _url + '/genre/movie/list',
    qs: { language: 'ko-KR', api_key: _api_key },
    body: '{}'
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    var result = JSON.parse(body);
    for (var i = 0; i < result["genres"].length; i++) {
      result["genres"][i]["icon_path"] = "/genre/" + result["genres"][i]["id"] + ".png";
    }
    result["source"] = 'api';
    client.setex(KEY_GENRE_ALL, 3600, JSON.stringify(result));
  });
}).start();*/

/*new cronJob('* * * 1 * *', function () {
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
}, null, true, "Asia/Seoul");*/


cron.schedule('* * 1 * *', function () {
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