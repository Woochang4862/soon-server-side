const FCM = require('fcm-node');
const serverKey = 'AAAAI0G_Y0Q:APA91bGhn2kP760NOiIen0omFbsXL5Y2rjo8xXMruA3NOB7ejNBWIFW0QvUfVejexO_ZBMppGcoBEFK_1rWeuI2SD2pWWXCkxmPToCh8usIQx9W25krGRGekcbo2WOS27YmazEWQQNgF';
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