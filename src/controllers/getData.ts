import { ResponseBuilder } from '../Builder/Response.builder';
import { BAD_REQUEST, endpoint, HttpException } from '../core';
import { MetadataModel } from '../database/models';
import redisClient from '../redis';
import { RequestCache } from '../RequestCache';
import { ConfigsType } from '../types';
import { toSHA1base64 } from '../utils';
import { configsValidator, urlValidator, validate } from '../validator';

export default endpoint({ query: { configs: urlValidator } }, async (req) => {
  // query metadata
  console.time('query metadata');
  const storedMetadata = await MetadataModel.findOne();
  console.timeEnd('query metadata');

  const configsUrl = req.query['configs'] as string;
  const RESPONSE_ID = storedMetadata?.lastRun + configsUrl;
  const RESPONSE_ID_HASH_KEY = toSHA1base64(RESPONSE_ID);
  const cachedResponse = await redisClient.get(RESPONSE_ID_HASH_KEY);
  if (cachedResponse) {
    console.log('cache hit');
    // stop early (return cached response if possible)
    return { content: JSON.parse(cachedResponse) };
  }

  // start fetch json data
  console.time('fetch json config');
  let configs;
  try {
    configs = (await RequestCache.getJSON<ConfigsType>(configsUrl)).record;
  } catch (error) {
    console.timeEnd('fetch json config');
    if (error instanceof RequestCache.HttpError) {
      console.log(error.message, configsUrl);
      throw new HttpException(BAD_REQUEST, {
        message: 'invalid configs URL',
      });
    } else if (error instanceof RequestCache.RequestError) {
      console.log(error.message, configsUrl);
      throw new HttpException(BAD_REQUEST, {
        message: 'invalid JSON configs URL',
      });
    } else {
      console.error(error);
      throw error;
    }
  }
  console.timeEnd('fetch json config');

  // validate data from configs Url
  console.time('validate data in sheetsList & traineesList');
  configs = validate(configsValidator, configs);
  console.timeEnd('validate data in sheetsList & traineesList');

  const responseBuilder = new ResponseBuilder(configs, storedMetadata);
  const response = await responseBuilder.toJSON();

  // cache response
  const EXPIRE_AFTER = 15 * 60; //  15 minutes to seconds
  redisClient
    .setEx(RESPONSE_ID_HASH_KEY, EXPIRE_AFTER, JSON.stringify(response))
    .catch((e) => console.error(e.message));

  return { content: response };
});
