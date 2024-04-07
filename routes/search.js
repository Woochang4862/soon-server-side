import express from 'express';
import fetch from 'node-fetch';
import api_key from '../config/tmdb.js';
import {client} from '../utils/redis.js';
import dotenv from 'dotenv';

dotenv.config();

const url = 'https://api.themoviedb.org/3';
const router = express.Router();
const caching_time = 300;

var searchCompanies = async function (req, res, next) {
  const qs = req.query;
  console.log(qs);

  const query = qs.query;
  const page = qs.page;
  const region = qs.region;
  console.log("request query : " + query);
  console.log("request page : " + page);
  console.log("request region : " + region);

  await client.connect();
  client.on('error', async (err) => {
      console.log("Error " + err);
      await client.quit()
  });

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
      await client.quit();
      return res.sendStatus(500);
    }
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

  await client.connect();
  client.on('error', async (err) => {
      console.log("Error " + err);
      await client.quit();
  });

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
      await client.quit();
      return res.sendStatus(500);
    }
  }

  await client.quit();
  req.movies = data;
  next();
};

router.get('/multi', searchCompanies, searchMovies, function (req, res) {
  const companies = req.companies;
  const movies = req.movies;

  if (companies.total_results >= movies.total_results) {
    res.status(200).json({ "companies": true, "results": { "movies": movies, "companies": companies } });
  }
  else {
    res.status(200).json({ "companies": false, "results": { "movies": movies, "companies": companies } });
  }
});

router.get('/company', searchCompanies, function (req, res) {
  res.status(200).json(req.companies);
});

router.get('/movie', searchMovies, function (req, res) {
  res.status(200).json(req.movies);
});

export default router;
