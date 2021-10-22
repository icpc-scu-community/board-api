import moment from 'moment';
import { BAD_REQUEST, endpoint, HttpException } from '../core';
import db from '../mongo';
import redisClient from '../redis';
import { RequestCache } from '../RequestCache';
import { SheetsMapType, SubmissionsType, TraineesListType, TraineesMapType } from '../types';
import { parseVerdict, toSHA1base64 } from '../utils';
import { sheetsListValidator, traineesListValidator, urlValidator, validate } from '../validator';

const queryParamsValidations = { 'trainees-list': urlValidator, 'sheets-list': urlValidator };

export default endpoint({ query: queryParamsValidations }, async (req) => {
  // query metadata
  console.time('query metadata');
  let metadata = await db.collection('scrapers').findOne();
  metadata = {
    lastUpdate: metadata?.lastUpdate ? moment(metadata.lastUpdate).fromNow() : 'N/A',
  };
  console.timeEnd('query metadata');

  const traineesListUrl = req.query['trainees-list'] as string;
  const sheetsListUrl = req.query['sheets-list'] as string;

  const RESPONSE_ID = metadata.lastUpdate + traineesListUrl + sheetsListUrl;
  const RESPONSE_ID_HASH_KEY = toSHA1base64(RESPONSE_ID);
  const cachedResponse = await redisClient.get(RESPONSE_ID_HASH_KEY);
  if (cachedResponse) {
    console.log('cache hit');
    // stop early (return cached response if possible)
    return { content: { ...JSON.parse(cachedResponse), metadata } }; // not cached metadata
  }

  // start fetch json data
  console.time('fetch json data');
  let traineesList, sheetsList;
  try {
    [traineesList, sheetsList] = await Promise.all([
      RequestCache.getJSON<TraineesListType>(traineesListUrl),
      RequestCache.getJSON<(number | string)[]>(sheetsListUrl),
    ]);
  } catch (error) {
    console.error(error);
    throw new HttpException(BAD_REQUEST, {
      message: 'invalid trainees-list or sheets-list urls',
    });
  }
  console.timeEnd('fetch json data');

  // validate data from sheetsUrl & traineesUrl
  console.time('validate data in sheetsList & traineesList');
  const validationSchema = { traineesList: traineesListValidator, sheetsList: sheetsListValidator };
  validate(validationSchema, { traineesList, sheetsList });
  console.timeEnd('validate data in sheetsList & traineesList');

  // sheets can be an array of (numerical) strings or numbers [ "123", 345 ]
  // turn every element into a number
  sheetsList = sheetsList.map((v) => (typeof v === 'number' ? v : parseInt(v)));
  // transform trainees handles to lowercase (handles are always stored as lowercase in DB)
  // to avoid RegExp search
  traineesList = traineesList.map(({ name, handle }) => ({ name, handle: handle.toLowerCase().trim() }));

  // query sheets data
  console.time('query storedSheets');
  const storedSheets = await db
    .collection('sheets')
    .find({ id: { $in: sheetsList } }, { projection: { _id: 0, __v: 0, 'problems._id': 0 } })
    .toArray();
  console.timeEnd('query storedSheets');

  // query submissions
  console.time('query submissions');
  const handles = traineesList.map(({ handle }) => handle);
  const storedSubmissions = await db
    .collection('submissions')
    .find({ contestId: { $in: sheetsList }, name: { $in: handles } }, { projection: { _id: 0, __v: 0 } })
    .toArray();
  console.log('found', storedSubmissions.length, 'submissions');
  console.timeEnd('query submissions');

  console.time('process data');
  // process data
  // 1. sheets
  const sheetsMap = {} as SheetsMapType;
  const sheets = sheetsList.map((sheetId, sheetIndex) => {
    const sheet = storedSheets.find((sheet) => sheet.id === sheetId);
    sheetsMap[sheetId] = { sheetIndex };
    if (!sheet) {
      // sheetsList can contain a sheet that has not been scraped before
      throw new HttpException(BAD_REQUEST, { message: 'sheet ' + sheetId + ' not found in stored sheets!' });
    }
    return {
      ...sheet,
      problems: sheet.problems.map((problem: { id: string }, problemIndex: number) => {
        sheetsMap[sheetId][problem.id] = problemIndex;

        return { ...problem, solved: 0 };
      }),
    };
  });

  // 2. submissions
  const submissions = {} as SubmissionsType;
  handles.forEach((handle) => (submissions[handle] = {}));

  // 3. trainees
  const traineesMap = {} as TraineesMapType;
  const trainees = traineesList.map((trainee, index) => {
    traineesMap[trainee.handle] = index;

    return {
      ...trainee,
      states: { solved: 0, tried: 0, submissions: 0 },
    };
  });

  for (let i = 0; i < storedSubmissions.length; i++) {
    const sub = storedSubmissions[i];
    const { id: submissionId, contestId, name: handle, verdict } = sub;
    const problemId = sub.problem.split(' - ')[0];

    const uniqueId = `${contestId}-${problemId}`;
    const shortVerdict = parseVerdict(verdict);
    const traineeIndex = traineesMap[handle];

    const submissionListItem = {
      id: submissionId,
      message: verdict,
      verdict: shortVerdict,
    };

    if (submissions[handle][uniqueId] === undefined) {
      submissions[handle][uniqueId] = {
        verdict: '',
        triesBeforeAC: 0,
        list: [],
      };
      trainees[traineeIndex].states.tried++;
    }

    const obj = submissions[handle][uniqueId];
    if (obj.verdict !== 'AC') {
      if (shortVerdict === 'AC') {
        obj.verdict = 'AC';
        trainees[traineeIndex].states.solved++;
        trainees[traineeIndex].states.tried--;
        sheets[sheetsMap[contestId].sheetIndex].problems[sheetsMap[contestId][problemId]].solved++;
      } else {
        obj.triesBeforeAC++;
      }
    }
    trainees[traineeIndex].states.submissions++;
    obj.list.push(submissionListItem);
  }
  console.timeEnd('process data');

  // sort first by solved (desc)
  // => if solved==0, sort by who tried more. else by who tried less
  // then by name (asc)
  const smaller_first = (num1: number, num2: number) => (num1 < num2 ? -1 : num1 > num2 ? 1 : 0);
  const greater_first = (num1: number, num2: number) => smaller_first(num2, num1);

  console.time('sort trainees');
  trainees.sort((t1, t2) => {
    if (t1.states.solved !== t2.states.solved) {
      return greater_first(t1.states.solved, t2.states.solved);
    }
    // t1_solved === t2_solved === 0
    if (t1.states.solved === 0) {
      return greater_first(t1.states.submissions, t2.states.submissions);
    }
    // t1_solved === t2_solved !== 0
    if (t1.states.submissions !== t2.states.submissions) {
      return smaller_first(t1.states.submissions, t2.states.submissions);
    }
    // t1_solved === t2_solved && t1_submissions === t2_submissions
    return t1.name.trim().toLowerCase().localeCompare(t2.name.trim().toLowerCase());
  });
  console.timeEnd('sort trainees');

  // response
  const response = {
    trainees,
    sheets,
    submissions,
    metadata,
  };

  // cache response
  const EXPIRE_AFTER = 15 * 60; //  15 minutes to seconds
  redisClient
    .setEx(RESPONSE_ID_HASH_KEY, EXPIRE_AFTER, JSON.stringify(response))
    .catch((e) => console.error(e.message));

  return { content: response };
});
