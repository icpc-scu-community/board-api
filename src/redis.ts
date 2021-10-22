import { createClient } from 'redis';
import env from './env';

const REDIS_URI = env('REDIS_URI');
const redisClient = createRedisClient(REDIS_URI);

function createRedisClient(REDIS_URI: string) {
  const client = createClient({ url: REDIS_URI });
  client
    .connect()
    .then(() => console.log('connected to Redis!'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
  return client;
}

export default redisClient;
