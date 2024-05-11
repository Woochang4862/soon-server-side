import express from 'express';
import client from '../utils/redis.js'
import fetch from 'node-fetch';
import api_key from '../config/tmdb.js';
import availableRegions from '../utils/availableRegions.js';
import getWatchProviderLink from '../utils/get-watch-provider-link.js';

const url = 'https://api.themoviedb.org/3';
const router = express.Router();

const caching_time = 300;

Date.prototype.yyyymmdd = function () {
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    return [this.getFullYear(),
    (mm > 9 ? '' : '0') + mm,
    (dd > 9 ? '' : '0') + dd
    ].join('-');
};

/**
 * @openapi
 * /TMM:
 *   get:
 *     description: Get a list of This Month Movies.
 *     responses:
 *       200:
 *         description: Returns a list of this month movie.
 *       500:
 *         description: Fail to get a list from TMDB API.
 */
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

    let data;
    try {
        if (!client.isReady){
            await client.connect();
        }
        let cached = await client.get(KEY_MOVIE_TMM_REGION_PAGE);
        if (cached) {
            data = JSON.parse(cached);
            data['source'] = "cache";
        } else {
            let response = await fetch(url + '/discover/movie?' + new URLSearchParams({
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
        }
    } catch (error) {
        console.log(error);
        await client.quit();
        return res.sendStatus(500);
    }
    await client.quit();
    return res.status(200).json(data);
});

router.get('/company', async function (req, res) {
    const qs = req.query;
    console.log(qs);
    const currentDate = new Date().yyyymmdd();
    console.log(currentDate);

    const id = qs.id;
    const page = qs.page;

    const KEY_MOVIE_COMPANY_REGION_ID_PAGE = req.originalUrl;

    let data;
    try {
        if (!client.isReady){
            await client.connect();
        }
        let cached = await client.get(KEY_MOVIE_COMPANY_REGION_ID_PAGE);
        if (cached) {
            data = JSON.parse(cached);
            data.source = "cache";
        } else {
            let response = await fetch(url + '/discover/movie?' + new URLSearchParams({
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
            client.setEx(KEY_MOVIE_COMPANY_REGION_ID_PAGE, caching_time, JSON.stringify(data));
        }
    } catch (error) {
        console.log(error);
        await client.quit()
        return res.sendStatus(500);
    }
    await client.quit()
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
    let data;
    try {
        if (!client.isReady){
            await client.connect();
        }

        let cached = await client.get(KEY_MOVIE_GENRE_REGION_ID_PAGE);
        if (cached) {
            data = JSON.parse(data);
            data.source = 'cache';
        } else {
            let response = await fetch(url + '/discover/movie?' + new URLSearchParams({
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
        }
    } catch (error) {
        console.log(error);
        await client.quit()
        return res.sendStatus(500);
    }
    await client.quit();
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
    let data;
    try {
        if (!client.isReady){
            await client.connect();
        }
        let cached = await client.get(KEY_MOVIE_DATE_REGION_DATE_PAGE);
        if (cached) {
            data = JSON.parse(cached);
            data.source = 'cache';
        } else {
            let response = await fetch(url + '/discover/movie?' + new URLSearchParams({
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
        }
    } catch (error) {
        console.log(error);
        await client.quit()
        return res.sendStatus(500);
    }
    await client.quit();
    return res.status(200).json(data);
});

router.get('/detail', async (req, res) => {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const region = qs.region;
    const KEY_MOVIE_DETAIL_REGION_ID = req.originalUrl;

    let data;
    try {
        if (!client.isReady){
            await client.connect();
        }
        let cached = await client.get(KEY_MOVIE_DETAIL_REGION_ID);

        if (cached) {
            data = JSON.parse(cached);
            data.source = 'cache';
        } else {
            let response = await fetch(url + '/movie/' + id + "?" + new URLSearchParams({
                append_to_response: 'videos,images',
                language: 'ko-KR',
                api_key,
                region
            }));
            data = await response.json();
            if (data.success) {
                throw new Error(data.status_message);
            } else {
                data.source = 'api';
                client.setEx(KEY_MOVIE_DETAIL_REGION_ID, caching_time, JSON.stringify(data));
            }
        }
    } catch (error) {
        console.log(error);
        await client.quit();
        return res.sendStatus(500);
    }
    await client.quit();
    return res.status(200).json(data);
});

router.get('/watch/providers', async (req, res) => {
    let qs = req.query;
    console.log(qs);
    let id = qs.id;
    let region = qs.region;

    if (availableRegions.includes(region)) {

        const KEY_MOVIE_WATCH_PROVIDERS_REGION_ID = req.originalUrl;

        let data;
        try {
            if (!client.isReady){
            await client.connect();
        }
            let cached = await client.get(KEY_MOVIE_WATCH_PROVIDERS_REGION_ID);
            if (cached) {
                data = JSON.parse(cached);
                data.source = 'cache';
            } else {
                let response = await fetch(url + '/movie/' + id + '/watch/providers?' + new URLSearchParams({
                    api_key
                }));
                data = await response.json();
                id = data.id;
                data = data["results"][region];
                if (data) {
                    data.id = id;
                } else {
                    data = { id };
                    return res.status(200).json(data);
                }

                let link = data.link;
                let links = await getWatchProviderLink(link);
                delete data.link;

                Object.keys(links).forEach((key, index) => {
                    let providers = links[key];
                    data[key] = data[key].map((v, i) => {
                        providers.forEach((provider) => {
                            if (v.logo_path == provider.logo_path) {
                                return Object.assign(v, provider);
                            }
                        });

                        return v
                    });
                });
                data.source = 'api';
                client.setEx(KEY_MOVIE_WATCH_PROVIDERS_REGION_ID, caching_time, JSON.stringify(data));
            }
        } catch (error) {
            console.log(error);
            await client.quit();
            return res.sendStatus(500);
        }
        await client.quit();
        return res.status(200).json(data);
    } else {
        await client.quit();
        return res.status(400).json({ message: "올바르지 못한 리전 코드입니다" }) //BAD REQUEST! : 올바르지 못한 리전 코드
    }
});

router.get('/credits', async (req, res) => {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const region = qs.region;
    const KEY_MOVIE_CREDITS_REGION_ID = req.originalUrl;

    let data;
    try {
        if (!client.isReady){
            await client.connect();
        }
        let cached = await client.get(KEY_MOVIE_CREDITS_REGION_ID);
        if (cached) {
            data = JSON.parse(cached);
            data.source = 'cache';
        } else {
            let response = await fetch(url + '/movie/' + id + '/credits?' + new URLSearchParams({
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            data.source = 'api';
            client.setEx(KEY_MOVIE_CREDITS_REGION_ID, caching_time, JSON.stringify(data));
        }
    } catch (error) {
        console.log(error);
        await client.quit();
        return res.sendStatus(500);
    }
    await client.quit();
    return res.status(200).json(data);
});

router.get('/similar', async function (req, res) {
    const qs = req.query;
    console.log(qs);
    const id = qs.id;
    const page = qs.page;
    const region = qs.region;
    const KEY_MOVIE_SIMILAR_ID_PAGE = req.originalUrl;

    let data;
    try {
        if (!client.isReady){
            await client.connect();
        }
        let cached = await client.get(KEY_MOVIE_SIMILAR_ID_PAGE);
        if (cached) {
            data = JSON.parse(cached);
            data.source = 'cache';
        } else {
            let response = await fetch(url + '/movie/' + id + '/similar?' + new URLSearchParams({
                page,
                language: 'ko-KR',
                api_key
            }));
            data = await response.json();
            data.source = 'api';
            client.setEx(KEY_MOVIE_SIMILAR_ID_PAGE, caching_time, JSON.stringify(data));
        }
    } catch (error) {
        console.log(error);
        await client.quit()
        return res.sendStatus(500);
    }
    await client.quit();
    return res.status(200).json(data);
});

export default router;
