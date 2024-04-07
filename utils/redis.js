import redis from 'redis';

export const client = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:6379`
});