import express from 'express';
import fetch from 'node-fetch';
import api_key from '../config/tmdb.js';
import redis from 'redis';
import dotenv from 'dotenv';

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

var searchCompanies = async function (req, res, next) {
  const qs = req.query;
  console.log(qs);

  const query = qs.query;
  const page = qs.page;
  const region = qs.region;
  console.log("request query : " + query);
  console.log("request page : " + page);
  console.log("request region : " + region);

  const KEY_SEARCH_COMPANY_REGION_QUERY_PAGE = req.originalUrl;

  let cache = await client.get(KEY_SEARCH_COMPANY_REGION_QUERY_PAGE);
  let data;

  if (cache) {
    data = JSON.parse(cache);
    data.source = 'cache';
  } else {
    let response;
    try {
      response = await fetch(url + '/search/company?' + new URLSearchParams({
        include_adult: 'false',
        page,
        query,
        language: 'ko-KR',
        api_key,
        region
      }));
      data = await response.json();
      data.source = 'api';
      client.setEx(KEY_SEARCH_COMPANY_REGION_QUERY_PAGE, caching_time, JSON.stringify(data));
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  req.companies = data;
  next();
};

var searchMovies = async function (req, res, next) {
  const qs = req.query;
  console.log(qs);

  const query = qs.query;
  const page = qs.page;
  const region = qs.region;
  console.log("request query : " + query);
  console.log("request page : " + page);
  console.log("request region : " + region);

  const KEY_SEARCH_MOVIE_REGION_QUERY_PAGE = req.originalUrl;

  let cache = await client.get(KEY_SEARCH_MOVIE_REGION_QUERY_PAGE);
  let data;

  if (cache) {
    data = JSON.parse(cache);
    data.source = 'cache';
  } else {
    let response;
    try {
      response = await fetch(url + '/search/movie?' + new URLSearchParams({
        include_adult: 'false',
        page,
        query,
        language: 'ko-KR',
        api_key,
        region
      }));
      data = await response.json();
      data.source = 'api';
      client.setEx(KEY_SEARCH_MOVIE_REGION_QUERY_PAGE, caching_time, JSON.stringify(data));
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  req.companies = data;
  next();
};

router.get('/multi', searchCompanies, searchMovies, function (req, res) {
  const companies = req.companies;
  const movies = req.movies;

  if (companies.total_results >= movies.total_results) {
    res.json({ "companies": true, "results": { "movies": movies, "companies": companies } });
  }
  else {
    res.json({ "companies": false, "results": { "movies": movies, "companies": companies } });
  }
});

router.get('/company', searchCompanies, function (req, res) {
  res.json(req.companies);
});

router.get('/movie', searchMovies, function (req, res) {
  res.json(req.movies);
});

export default router;
