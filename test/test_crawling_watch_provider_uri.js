import axios from 'axios';
import { load } from 'cheerio';
import main from '../utils/get-watch-provider-link.js';

main("https://www.themoviedb.org/movie/550988-free-guy/watch?locale=KR").then(console.log)
//main("https://www.themoviedb.org/movie/614479/watch").then(console.log)
//main("https://www.themoviedb.org/movie/961268/watch").then(console.log)