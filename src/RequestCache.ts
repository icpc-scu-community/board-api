import got from 'got';
import redisClient from './redis';

const EXPIRE_AFTER = 60 * 60; // 60 minutes in seconds
export class RequestCache {
  static HttpError = got.HTTPError;
  static RequestError = got.RequestError;

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
