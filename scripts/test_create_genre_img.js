const request = require('request');
const _api_key = require('../config/tmdb').api_key
const _url = 'https://api.themoviedb.org/3';
const async = require("async");

Date.prototype.yyyymmdd = function () {
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
    ].join('-');
};

var options = {
    method: 'GET',
    url: _url + '/genre/movie/list',
    qs: { language: 'ko-KR', api_key: _api_key }
};

var genreImgs = Object();

request(options, function (error, response, body) {
    if (error) throw new Error(error);
    var result = JSON.parse(body);
    const currentDate = new Date().yyyymmdd();
    var i = 0;
    async.whilst(
        function () {
            return i < result["genres"].length;
        },
        function (next) {
            var options = {
                method: 'GET',
                url: _url + '/discover/movie',
                qs:
                {
                    with_genres: result["genres"][i].id,
                    'release_date.gte': currentDate,
                    page: 1,
                    include_video: 'false',
                    include_adult: 'false',
                    region: 'KR',
                    sort_by: 'popularity.desc',
                    language: 'ko-KR',
                    api_key: _api_key
                }
            };

            request(options, function (error, response, _body) {
                if (error) throw new Error(error);
                var body = JSON.parse(_body);
                console.log(result["genres"][i].id, body["results"].length);
                if (body["results"].length != 0) {
                    for (let e of body["results"]) {
                        if (e.poster_path) { genreImgs[result["genres"][i].id] = e.poster_path; break; }
                        if (e.backdrop_path) { genreImgs[result["genres"][i].id] = e.backdrop_path; break; }
                    }
                    if (!genreImgs[result["genres"][i].id]) {
                        // 제공된 이미지가 없습니다
                        genreImgs[result["genres"][i].id] = "제공된 이미지가 없습니다";
                    }
                } else {
                    // 상영예정인 영화가 없습니다
                    genreImgs[result["genres"][i].id] = "상영예정인 영화가 없습니다";
                }
                i++;
                next();
            });
        },
        function (err) {
            if (err) console.log(new Error(err));
            console.log('result: ', genreImgs);
        }
    )
});