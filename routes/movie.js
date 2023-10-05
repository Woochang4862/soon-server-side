import express from 'express';
import redis from 'redis';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import api_key from '../config/tmdb.js';
import availableRegions from '../utils/availableRegions.js';

dotenv.config();

const url = 'https://api.themoviedb.org/3';
const router = express.Router();
const client = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:6379`
});
await client.connect();
const caching_time = 300;
client.on('error', (err) => {
    console.log("Error " + err);
});

Date.prototype.yyyymmdd = function () {
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
    ].join('-');
};

router.get('/TMM', async function (req, res) {
    const qs = req.query;
    console.log(qs);
    const now = new Date();
    const firstDate = new Date(now.getYear() + 1900, now.getMonth(), 1).yyyymmdd();
    const lastDate = new Date(now.getYear() + 1900, now.getMonth() + 1, 0).yyyymmdd();
    console.log("first date : " + firstDate);
    console.log("last date : " + lastDate);
    const region = qs.region;
    const page = qs.page;

    const KEY_MOVIE_TMM_REGION_PAGE = req.originalUrl;

    let cached = await client.get(KEY_MOVIE_TMM_REGION_PAGE);
    let data;
    if (cached) {
        data = JSON.parse(cached);
        data['source'] = "cache";
    } else {
        let response;
        try {
            response = await fetch(url + '/discover/movie?' + new URLSearchParams({
                'release_date.lte': lastDate,
                'release_date.gte': firstDate,
                'primary_release_date.lte': lastDate,
                'primary_release_date.gte': firstDate,
                page,
                include_video: 'false',
                region,
                include_adult: 'false',
                sort_by: 'popularity.desc',
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            console.log(data);
            data["source"] = 'api';
            let results = data["results"];
            data["results"] = [];
            results.forEach(result => {
                if (result.popularity >= 0) {
                    data["results"].push(result);
                } else {
                    data["total_results"]--;
                }
            });
            await client.setEx(KEY_MOVIE_TMM_REGION_PAGE, caching_time, JSON.stringify(data));
        } catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }
    return res.status(200).json(data);
});

router.get('/company', async function (req, res) {
    const qs = req.query;
    console.log(qs);
    const currentDate = new Date().yyyymmdd();
    console.log(currentDate);

    const id = qs.id;
    const page = qs.page;
    const region = qs.region;

    const KEY_MOVIE_COMPANY_REGION_ID_PAGE = req.originalUrl;

    let cached = await client.get(KEY_MOVIE_COMPANY_REGION_ID_PAGE);
    let data;
    if (cached) {
        data = JSON.parse(cached);
        data.source = "cache";
    } else {
        let response;
        try {
            response = await fetch(url + '/discover/movie?' + new URLSearchParams({
                with_companies: id,
                'release_date.gte': currentDate,
                page,
                include_video: 'false',
                region: 'US',
                include_adult: 'false',
                sort_by: 'popularity.desc',
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            data.source = 'api';
            client.setEx(KEY_MOVIE_COMPANY_REGION_ID_PAGE, caching_time, JSON.stringify(body));
            res.json(body);
        } catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }

    return res.status(200).json(data);
});

router.get('/genre', async function (req, res) {
    const qs = req.query;
    console.log(qs);
    const currentDate = new Date().yyyymmdd();
    console.log(currentDate);

    const id = qs.id;
    const page = qs.page;
    const region = qs.region;

    const KEY_MOVIE_GENRE_REGION_ID_PAGE = req.originalUrl;

    let cached = await client.get(KEY_MOVIE_GENRE_REGION_ID_PAGE);
    let data;
    if (cached) {
        data = JSON.parse(data);
        data.source = 'cache';
    } else {
        let response;
        try {
            response = await fetch(url + '/discover/movie?' + new URLSearchParams({
                with_genres: id,
                'release_date.gte': currentDate,
                page,
                include_video: 'false',
                include_adult: 'false',
                region,
                sort_by: 'popularity.desc',
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            data.source = 'api';
            client.setEx(KEY_MOVIE_GENRE_REGION_ID_PAGE, caching_time, JSON.stringify(data));
        } catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }
    return res.status(200).json(data);
});

router.get('/date', async function (req, res) {
    const qs = req.query;
    console.log(qs);
    const date = qs.date; // yyyy-MM-dd
    console.log(date);

    const page = qs.page;
    const region = qs.region;

    const KEY_MOVIE_DATE_REGION_DATE_PAGE = req.originalUrl;

    let cached = await client.get(KEY_MOVIE_DATE_REGION_DATE_PAGE);
    let data;

    if (cached) {
        data = JSON.parse(cached);
        data.source = 'cache';
    } else {
        let response;
        try {
            response = await fetch(url + '/discover/movie?' + new URLSearchParams({
                'primary_release_date.gte': date,
                'primary_release_date.lte': date,
                page,
                include_video: 'false',
                include_adult: 'false',
                sort_by: 'popularity.desc',
                region,
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            data.source = 'api';
            client.setEx(KEY_MOVIE_DATE_REGION_DATE_PAGE, caching_time, JSON.stringify(data));
        } catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }

    return res.status(200).json(data);
});

router.get('/detail', async (req, res) => {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const region = qs.region;

    const KEY_MOVIE_DETAIL_REGION_ID = req.originalUrl;

    let cached = await client.get(KEY_MOVIE_DETAIL_REGION_ID);
    let data;

    if (cached) {
        data = JSON.parse(cached);
        data.source = 'cache';
    } else {
        let response;
        try {
            let tmp = url + '/movie/' + id+"?" + new URLSearchParams({
                append_to_response: 'videos,images',
                language: 'ko-KR',
                api_key,
                region
            });
            console.log(tmp);
            response = await fetch(tmp);
            data = await response.json();
            console.log(data);
            console.log(Boolean(data.success));
            if(data.success){
                throw new Error(data.status_message);
            } else {
                data.source = 'api';
                client.setEx(KEY_MOVIE_DETAIL_REGION_ID, caching_time, JSON.stringify(data));
            }
        } catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }

    return res.status(200).json(data);
});

router.get('/watch/providers', async (req, res) => {
    const qs = req.query;
    console.log(qs);
    let id = qs.id;
    const region = qs.region;

    if (availableRegions.includes(region)) {

        const KEY_MOVIE_WATCH_PROVIDERS_REGION_ID = req.originalUrl;

        let cached = await client.get(KEY_MOVIE_WATCH_PROVIDERS_REGION_ID);
        let data;

        if (cached) {
            data = JSON.parse(cached);
            data.source = 'cache';
        } else {
            let response;
            try {
                response = await fetch(url + '/movie/' + id + '/watch/providers?' + new URLSearchParams({
                    api_key
                }));
                data = await response.json();
                id = data.id;
                results = data["results"][region];
                if (results) {
                    body = results;
                    data.id = id;
                } else {
                    body = { id };
                }
                body.source = 'api';
                client.setEx(KEY_MOVIE_WATCH_PROVIDERS_REGION_ID, caching_time, JSON.stringify(data));
            } catch (error) {
                console.log(error);
                return res.sendStatus(500);
            }
        }

        return res.status(200).json(data);
    } else {
        return res.status(400).json({ message: "올바르지 못한 리전 코드입니다" }) //BAD REQUEST! : 올바르지 못한 리전 코드
    }
});

router.get('/credits', async (req, res) => {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const region = qs.region;

    const KEY_MOVIE_CREDITS_REGION_ID = req.originalUrl;

    let cached = await client.get(KEY_MOVIE_CREDITS_REGION_ID);
    let data;
    if (cached) {
        data = JSON.parse(cached);
        data.source = 'cache';
    } else {
        let response;
        try {
            response = await fetch(url + '/movie/' + id + '/credits?' + new URLSearchParams({
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            data.source = 'api';
            client.setEx(KEY_MOVIE_CREDITS_REGION_ID, caching_time, JSON.stringify(data));
        } catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }

    return res.status(200).json(data);
});

router.get('/similar', async function (req, res) {
    const qs = req.query;
    console.log(qs);

    const id = qs.id;
    const page = qs.page;
    const region = qs.region;

    const KEY_MOVIE_SIMILAR_ID_PAGE = req.originalUrl;

    let cached = await client.get(KEY_MOVIE_SIMILAR_ID_PAGE);
    let data;

    if (cached) {
        data = JSON.parse(cached);
        data.source = 'cache';
    } else {
        let response;
        try {
            response = await fetch(url + '/movie/' + id + '/similar' + new URLSearchParams({
                page,
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            data.source = 'api';
            client.setEx(KEY_MOVIE_SIMILAR_ID_PAGE, caching_time, JSON.stringify(data));
        } catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }

    return res.status(200).json(data);
});

export default router;
