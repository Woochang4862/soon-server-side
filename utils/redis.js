import redis from 'redis';

const client = redis.createClient({
        url: `redis://${process.env.REDIS_HOST}:6379`
    })
    .on('connect', () => {
        // 연결이 성공적으로 이루어질 때의 이벤트 핸들러
        console.log('Successfully Connected to Redis server!');
    })
    .on('error', async (err) => {
        // 에러 발생 시의 이벤트 핸들러
        console.log("Redis Error " + err);
        await client.quit()
    });

export default client;