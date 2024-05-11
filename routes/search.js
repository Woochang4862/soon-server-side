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
  switch (req.path) {
    case req.baseUrl + "/multi":
      req.searchType = "multi"
      req.KEY_SEARCH_MULTI_MOVIE = req.originalUrl + ".movie";
      req.KEY_SEARCH_MULTI_COMPANY = req.originalUrl + ".company";
      break;
    case req.baseUrl + "/movie":
      req.searchType = "movie"
      req.KEY_SEARCH_MOVIE = req.originalUrl;
      break;
    case req.baseUrl + "/company":
      req.searchType = "company"
      req.KEY_SEARCH_COMPANY = req.originalUrl;
      break;
  }
  next();
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

  let data;
  try {
    if (!client.isReady) {
      await client.connect();
    }
    let cache;
    if (req.searchType == 'multi') {
      cache = await client.get(req.KEY_SEARCH_MULTI_COMPANY);
    } else {
      cache = await client.get(req.KEY_SEARCH_COMPANY);
    }
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
    let cache;
    if (req.searchType == 'multi') {
      cache = await client.get(req.KEY_SEARCH_MULTI_COMPANY);
    } else {
      cache = await client.get(req.KEY_SEARCH_MOVIE);
    }
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

router.get('/multi', checkSearchType, searchCompanies, searchMovies, async function (req, res) {
  const companies = req.companies;
  const movies = req.movies;

  let data;
  if (companies.total_results >= movies.total_results) {
    data = { "companies": true, "results": { "movies": movies, "companies": companies } }
  }
  else {
    data = { "companies": false, "results": { "movies": movies, "companies": companies } }
  }
  if (data.source == 'api') {
    try {
      if (!client.isReady) {
        await client.connect();
      }
      const KEY_SEARCH_MULTI_REGION_QUERY_PAGE = req.originalUrl
      client.setEx(KEY_SEARCH_MULTI_REGION_QUERY_PAGE, caching_time, data);
      await client.quit();
    } catch (error) {
      console.log(error);
      await client.quit();
      return res.status(200).json(data);
    }
  }
  return res.status(200).json(data);
});

router.get('/company', checkSearchType, searchCompanies, async function (req, res) {
  let data = req.companies;
  if (data.source == 'api') {
    try {
      if (!client.isReady) {
        await client.connect();
      }
      let KEY_SEARCH_COMPANY_REGION_QUERY_PAGE = req.originalUrl;
      client.setEx(KEY_SEARCH_COMPANY_REGION_QUERY_PAGE, caching_time, data);
      await client.quit();
    } catch (error) {
      console.log(error);
      await client.quit();
      return res.status(200).json(data);
    }
  }
  return res.status(200).json(data);
});

router.get('/movie', checkSearchType, searchMovies, async function (req, res) {
  let data = req.movies;
  if (data.source == 'api') {
    try {
      if (!client.isReady) {
        await client.connect();
      }
      let KEY_SEARCH_MOVIE_REGION_QUERY_PAGE = req.originalUrl;
      client.setEx(KEY_SEARCH_MOVIE_REGION_QUERY_PAGE, caching_time, data);
      await client.quit();
    } catch (error) {
      console.log(error);
      await client.quit();
      return res.status(200).json(data);
    }
  }
  return res.status(200).json(data);
});

export default router;
