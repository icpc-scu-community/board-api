import { ResponseBuilder } from '../Builder/Response.builder';
import { endpoint } from '../core';
import { ContestModel, MetadataModel, SubmissionModel } from '../database/models';
import redisClient from '../redis';
import { CodeforcesAPI } from '../services/codeforces.api';
import { toSHA1base64 } from '../utils';
import { configsValidator, validate } from '../validator';

export default endpoint(async () => {
  // query metadata
  console.time('query metadata');
  const storedMetadata = await MetadataModel.findOne();
  console.timeEnd('query metadata');

  const RESPONSE_ID = storedMetadata?.lastRun + '';
  const RESPONSE_ID_HASH_KEY = toSHA1base64(RESPONSE_ID);
  const cachedResponse = await redisClient.get(RESPONSE_ID_HASH_KEY);
  if (cachedResponse) {
    console.log('cache hit');
    // stop early (return cached response if possible)
    return { content: JSON.parse(cachedResponse) };
  }

  console.time('fetch unique handles from DB');
  const uniqueTrainees = await SubmissionModel.distinct('handle');
  console.timeEnd('fetch unique handles from DB');

  console.time('fetch handles data (name) from Codeforces API');
  const trainees = await CodeforcesAPI.getNamesFromHandles(uniqueTrainees);
  console.timeEnd('fetch handles data (name) from Codeforces API');

  // get all saved contests and group by groupId
  const groups = await ContestModel.aggregate()
    .group({
      _id: '$groupId',
      contests: { $push: '$id' },
    })
    .project({
      _id: 0,
      id: '$_id',
      contests: 1,
    });

  // validate data from configs Url
  console.time('validate data in groupsList & traineesList');
  const configs = validate(configsValidator, { groups, trainees });
  console.timeEnd('validate data in groupsList & traineesList');

  const responseBuilder = new ResponseBuilder(configs, storedMetadata);
  const response = await responseBuilder.toJSON();

  // cache response
  const EXPIRE_AFTER = 15 * 60; //  15 minutes to seconds
  redisClient
    .setEx(RESPONSE_ID_HASH_KEY, EXPIRE_AFTER, JSON.stringify(response))
    .catch((e) => console.error(e.message));

  return { content: response };
});
