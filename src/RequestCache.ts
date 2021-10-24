import got from 'got';
import redisClient from './redis';

const EXPIRE_AFTER = 30 * 60; // 30 minutes in seconds
export class RequestCache {
  static async getJSON<T>(url: string): Promise<T> {
    const cachedResponse = await redisClient.get(url);
    if (cachedResponse) {
      return JSON.parse(cachedResponse);
    }
    const response = await got(url).json<T>();
    redisClient.setEx(url, EXPIRE_AFTER, JSON.stringify(response));
    return response;
  }
}