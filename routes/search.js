import express from 'express';
import fetch from 'node-fetch';
import api_key from '../config/tmdb.js';
import client from '../utils/redis.js';
import dotenv from 'dotenv';

dotenv.config();

const url = 'https://api.themoviedb.org/3';
const router = express.Router();
const caching_time = 300;


/**
 * 
 * 
 */
var checkSearchType = async function (req, res, next) {
  try {
    if (!client.isReady) {
      await client.connect();
    }
    switch (req.path) {
      case req.baseUrl + "/multi":

        break;
      case req.baseUrl + "/movie":
        break;
      case req.baseUrl + "/company":
        break;
    }
  } catch (error) {
    console.log(error);
    await client.quit();
    return res.status(500);
  }
}

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

  let data;
  try {
    if (!client.isReady) {
      await client.connect();
    }
    let cache = await client.get(KEY_SEARCH_COMPANY_REGION_QUERY_PAGE);
    if (cache) {
      data = JSON.parse(cache);
      data.source = 'cache';
    } else {
      let response = await fetch(url + '/search/company?' + new URLSearchParams({
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
    }
  } catch (error) {
    console.log(error);
    await client.quit();
    return res.sendStatus(500);
  }
  await client.quit();
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

  let data;
  try {
    if (!client.isReady) {
      await client.connect();
    }
    let cache = await client.get(KEY_SEARCH_MOVIE_REGION_QUERY_PAGE);
    if (cache) {
      data = JSON.parse(cache);
      data.source = 'cache';
    } else {
      let response = await fetch(url + '/search/movie?' + new URLSearchParams({
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
    }
  } catch (error) {
    console.log(error);
    await client.quit();
    return res.sendStatus(500);
  }
  await client.quit();
  req.movies = data;
  next();
};

router.get('/multi', searchCompanies, searchMovies, async function (req, res) {
  const companies = req.companies;
  const movies = req.movies;
  const KEY_SEARCH_MULTI_REGION_QUERY_PAGE = req.originalUrl;

  let data;
  try {
    if (companies.total_results >= movies.total_results) {
      data = { "companies": true, "results": { "movies": movies, "companies": companies } }
    }
    else {
      data = { "companies": true, "results": { "movies": movies, "companies": companies } }
    }
  } catch (error) {
    console.log("Redis Connect : " + error);
    // await client.quit(); // redis 연결 실패 예외이므로 연결 안됨!
    return res.status(500);
  }
  client.setEx(KEY_SEARCH_MULTI_REGION_QUERY_PAGE, caching_time, data);
  return res.status(200).json(data);
});

router.get('/company', searchCompanies, function (req, res) {
  let data = req.companies;
  let KEY_SEARCH_COMPANY_REGION_QUERY_PAGE = req.originalUrl;
  client.setEx(KEY_SEARCH_COMPANY_REGION_QUERY_PAGE, caching_time, data);
  return res.status(200).json(data);
});

router.get('/movie', searchMovies, function (req, res) {
  let data = req.movies;
  let KEY_SEARCH_MOVIE_REGION_QUERY_PAGE = req.originalUrl;
  client.setEx(KEY_SEARCH_MOVIE_REGION_QUERY_PAGE, caching_time, data);
  return res.status(200).json(data);
});

export default router;
