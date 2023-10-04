const FCM = require('fcm-node');
const serverKey = require('../config/firebase').api_key;
const fcm = new FCM(serverKey);

var message = {
    "to": "/topics/all",

    "notification": {
        "title": 'Soon',
        "body": '이번달에 무슨 영화가 개봉하는지 확인하세요'
    },

    "priority": "high"
};

fcm.send(message, function (err, response) {
    if (err) {
        console.log("Something has gone wrong!");
    } else {
        console.log("Successfully sent with response: ", response);
    }
});
