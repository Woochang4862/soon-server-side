var cron = require('node-cron');
const request = require('request');
const redis = require('redis');

const client = redis.createClient(6379);

client.on('error', (err)=>{
  console.log("Error "+err);
});

const _api_key = 'dacdeb969b934abef7e5002b69d6c9ae';
const _url = 'https://api.themoviedb.org/3';

cron.schedule('0 * * * *', function(){
  var options = {
    method: 'GET',
    url: _url+'/genre/movie/list',
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
}).start();
