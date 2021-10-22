import got from 'got';
import redisClient from './redis';

export class RequestCache {
  static async getJSON<T>(url: string): Promise<T> {
    const cachedResponse = await redisClient.get(url);
    if (cachedResponse) {
      return JSON.parse(cachedResponse);
    }
    const response = await got(url).json<T>();
    redisClient.set(url, JSON.stringify(response));
    return response;
  }
}
