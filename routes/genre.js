import express from 'express';
import { client } from '../utils/redis.js';
import api_key from '../config/tmdb.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config()

const router = express.Router();
const url = 'https://api.themoviedb.org/3';

const caching_time = 300;

Date.prototype.yyyymmdd = function () {
  var mm = this.getMonth() + 1;
  var dd = this.getDate();

  return [this.getFullYear(),
  (mm > 9 ? '' : '0') + mm,
  (dd > 9 ? '' : '0') + dd
  ].join('-');
};

router.get('/all', async function (req, res) {
  const KEY_GENRE_ALL = req.originalUrl;
  const region = req.query.region;
  console.log(KEY_GENRE_ALL);
  if (!client.isReady) {
    await client.connect();
  }
  let cached = await client.get(KEY_GENRE_ALL);
  let data;
  if (cached) {
    data = JSON.parse(cached);
    data["source"] = 'cache';
  } else {
    let response;
    try {
      response = await fetch(url + '/genre/movie/list?' + new URLSearchParams({
        language: 'ko-KR', api_key
      }));
      data = await response.json();

      let i = 0;
      const currentDate = new Date().yyyymmdd();

      while (i < data.genres.length) {
        response = await fetch(url + '/discover/movie?' + new URLSearchParams({
          with_genres: data.genres[i].id,
          'release_date.gte': currentDate,
          page: 1,
          include_video: 'false',
          include_adult: 'false',
          region,
          sort_by: 'popularity.desc',
          language: 'ko-KR',
          api_key
        }));
        let { results } = await response.json();
        if (results.length != 0) {
          for (let result of results) {
            if (result.poster_path) { data.genres[i]["icon_path"] = result.poster_path; break; }
            if (result.backdrop_path) { data.genres[i]["icon_path"] = result.backdrop_path; break; }
          }
          if (!data.genres[i]["icon_path"]) {
            // 제공된 이미지가 없습니다
            data.genres[i]["icon_path"] = "제공된 이미지가 없습니다";
          }
        } else {
          // 상영예정인 영화가 없습니다
          data.genres[i]["icon_path"] = "상영예정인 영화가 없습니다";
        }
        i++;
      }

      data["source"] = 'api';
      await client.setEx(KEY_GENRE_ALL, caching_time, JSON.stringify(data));
    } catch (error) {
      console.log(error);
      await client.quit();
      return res.sendStatus(500);
    }
  }
  await client.quit();
  return res.status(200).json(data);
});

export default router;
