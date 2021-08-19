const express = require('express');
const router = express.Router();

const request = require('request');
const _url = 'https://api.themoviedb.org/3';
const _api_key = require('../config/tmdb').api_key

const redis = require('redis');
const client = redis.createClient(6379);
const caching_time = 300;
client.on('error', (err) => {
    console.log("Error " + err);
});

const availableRegions = require('./availableRegions');

Date.prototype.yyyymmdd = function () {
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
    ].join('-');
};

router.get('/TMM', function (req, res) {
    const qs = req.query;
    console.log(qs);
    const now = new Date();
    const firstDate = new Date(now.getYear() + 1900, now.getMonth(), 1).yyyymmdd();
    const lastDate = new Date(now.getYear() + 1900, now.getMonth() + 1, 0).yyyymmdd();
    console.log("first date : " + firstDate);
    console.log("last date : " + lastDate);
    const _region = qs.region;
    const _page = qs.page;

    const KEY_MOVIE_TMM_REGION_PAGE = req.originalUrl;

    return client.get(KEY_MOVIE_TMM_REGION_PAGE, (err, data) => {
        if (data) {
            var data = JSON.parse(data);
            data["source"] = 'cache';
            console.log(data);
            return res.json(data);
        } else {
            var options = {
                method: 'GET',
                url: _url + '/discover/movie',
                qs:
                {
                    'release_date.lte': lastDate,
                    'release_date.gte': firstDate,
                    'primary_release_date.lte': lastDate,
                    'primary_release_date.gte': firstDate,
                    page: _page,
                    include_video: 'false',
                    region: _region,
                    include_adult: 'false',
                    sort_by: 'popularity.desc',
                    language: 'ko-KR',
                    api_key: _api_key
                }
            };

            request(options, function (error, response, _body) {
                if (error) throw new Error(error);
                var body = JSON.parse(_body);
                body["source"] = 'api';
                var results = body["results"];
                body["results"] = [];
                results.forEach(result => {
                    if (result.popularity >= 0) {
                        body["results"].push(result);
                    } else {
                        body["total_results"]--;
                    }
                });
                client.setex(KEY_MOVIE_TMM_REGION_PAGE, caching_time, JSON.stringify(body));
                console.log(body);
                return res.json(body);
            });
        }
    });
});

router.get('/company', function (req, res) {
    const qs = req.query;
    console.log(qs);
    const currentDate = new Date().yyyymmdd();
    console.log(currentDate);

    const id = qs.id;
    const _page = qs.page;
    const _region = qs.region;

    const KEY_MOVIE_COMPANY_REGION_ID_PAGE = req.originalUrl;

    return client.get(KEY_MOVIE_COMPANY_REGION_ID_PAGE, (err, data) => {
        if (data) {
            var data = JSON.parse(data);
            data["source"] = 'cache';
            return res.json(data);
        } else {
            var options = {
                method: 'GET',
                url: _url + '/discover/movie',
                qs:
                {
                    with_companies: id,
                    'release_date.gte': currentDate,
                    page: _page,
                    include_video: 'false',
                    region: 'US',
                    include_adult: 'false',
                    sort_by: 'popularity.desc',
                    language: 'ko-KR',
                    api_key: _api_key
                }
            };

            request(options, function (error, response, _body) {
                if (error) throw new Error(error);
                var body = JSON.parse(_body);
                body["source"] = 'api';
                client.setex(KEY_MOVIE_COMPANY_REGION_ID_PAGE, caching_time, JSON.stringify(body));
                res.json(body);
            });
        }
    })
});

router.get('/genre', function (req, res) {
    const qs = req.query;
    console.log(qs);
    const currentDate = new Date().yyyymmdd();
    console.log(currentDate);

    const id = qs.id;
    const _page = qs.page;
    const _region = qs.region;

    const KEY_MOVIE_GENRE_REGION_ID_PAGE = req.originalUrl;

    return client.get(KEY_MOVIE_GENRE_REGION_ID_PAGE, (err, data) => {
        if (data) {
            var data = JSON.parse(data);
            data["source"] = 'cache';
            return res.json(data);
        } else {
            var options = {
                method: 'GET',
                url: _url + '/discover/movie',
                qs:
                {
                    with_genres: id,
                    'release_date.gte': currentDate,
                    page: _page,
                    include_video: 'false',
                    include_adult: 'false',
                    region: _region,
                    sort_by: 'popularity.desc',
                    language: 'ko-KR',
                    api_key: _api_key
                }
            };

            request(options, function (error, response, _body) {
                if (error) throw new Error(error);
                var body = JSON.parse(_body);

                body["source"] = 'api';
                client.setex(KEY_MOVIE_GENRE_REGION_ID_PAGE, caching_time, JSON.stringify(body));
                return res.json(body);
            });
        }
    });
});

router.get('/date', function (req, res) {
    const qs = req.query;
    console.log(qs);
    const date = qs.date; // yyyy-MM-dd
    console.log(date);

    const _page = qs.page;
    const _region = qs.region;

    const KEY_MOVIE_DATE_REGION_DATE_PAGE = req.originalUrl;

    return client.get(KEY_MOVIE_DATE_REGION_DATE_PAGE, (err, data) => {
        if (data) {
            var data = JSON.parse(data);
            data["source"] = 'cache';
            return res.json(data);
        } else {
            var options = {
                method: 'GET',
                url: _url + '/discover/movie',
                qs:
                {
                    'primary_release_date.gte': date,
                    'primary_release_date.lte': date,
                    page: _page,
                    include_video: 'false',
                    include_adult: 'false',
                    sort_by: 'popularity.desc',
                    region: _region,
                    language: 'ko-KR',
                    api_key: _api_key
                }
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                var body = JSON.parse(body);
                body["source"] = 'api';
                client.setex(KEY_MOVIE_DATE_REGION_DATE_PAGE, caching_time, JSON.stringify(body));
                return res.json(body);
            });
        }
    });
});

router.get('/detail', (req, res) => {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const _region = qs.region;

    const KEY_MOVIE_DETAIL_REGION_ID = req.originalUrl;

    return client.get(KEY_MOVIE_DETAIL_REGION_ID, (err, data) => {
        if (data) {
            var data = JSON.parse(data);
            data["source"] = 'cache';
            return res.json(data);
        } else {
            var options = {
                method: 'GET',
                url: _url + '/movie/' + id,
                qs:
                {
                    append_to_response: 'videos,images',
                    language: 'ko-KR',
                    api_key: _api_key,
                    region: _region
                }
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                var body = JSON.parse(body);
                body["source"] = 'api';
                client.setex(KEY_MOVIE_DETAIL_REGION_ID, caching_time, JSON.stringify(body));
                return res.json(body);
            });
        }
    });
});

router.get('/watch/providers', (req, res) => {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const _region = qs.region;

    if (availableRegions.includes(_region)) {

        const KEY_MOVIE_WATCH_PROVIDERS_REGION_ID = req.originalUrl;

        return client.get(KEY_MOVIE_WATCH_PROVIDERS_REGION_ID, (err, data) => {
            if (data) {
                var data = JSON.parse(data);
                data["source"] = 'cache';
                return res.json(data);
            } else {
                var options = {
                    method: 'GET',
                    url: _url + '/movie/' + id + '/watch/providers',
                    qs:
                    {
                        api_key: _api_key
                    }
                };

                request(options, function (error, response, body) {
                    if (error) throw new Error(error);
                    var body = JSON.parse(body);
                    body["source"] = 'api';
                    var data = body["results"][_region];
                    body["results"] = data
                    client.setex(KEY_MOVIE_WATCH_PROVIDERS_REGION_ID, caching_time, JSON.stringify(body));
                    return res.json(body);
                });
            }
        });
    } else {
        return res.status(400) //BAD REQUEST! : 올바르지 못한 리전 코드
    }
});

router.get('/credits', (req, res) => {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const _region = qs.region;

    const KEY_MOVIE_CREDITS_REGION_ID = req.originalUrl;

    return client.get(KEY_MOVIE_CREDITS_REGION_ID, (err, data) => {
        if (data) {
            var data = JSON.parse(data);
            data["source"] = 'cache';
            return res.json(data);
        } else {
            var options = {
                method: 'GET',
                url: _url + '/movie/' + id + '/credits',
                qs:
                {
                    language: 'ko-KR',
                    api_key: _api_key
                }
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);
                var body = JSON.parse(body);
                body["source"] = 'api';
                client.setex(KEY_MOVIE_CREDITS_REGION_ID, caching_time, JSON.stringify(body));
                return res.json(body);
            });
        }
    });
});

router.get('/similar', function (req, res) {
    const qs = req.query;
    console.log(qs);

    const id = qs.id;
    const _page = qs.page;
    const _region = qs.region;

    const KEY_MOVIE_SIMILAR_ID_PAGE = req.originalUrl;

    return client.get(KEY_MOVIE_SIMILAR_ID_PAGE, (err, data) => {
        if (data) {
            var data = JSON.parse(data);
            data["source"] = 'cache';
            return res.json(data);
        } else {
            var options = {
                method: 'GET',
                url: _url + '/movie/' + id + '/similar',
                qs:
                {
                    page: _page,
                    language: 'ko-KR',
                    api_key: _api_key
                }
            };

            request(options, function (error, response, _body) {
                if (error) throw new Error(error);
                var body = JSON.parse(_body);

                body["source"] = 'api';
                client.setex(KEY_MOVIE_SIMILAR_ID_PAGE, caching_time, JSON.stringify(body));
                return res.json(body);
            });
        }
    });
});

module.exports = router;