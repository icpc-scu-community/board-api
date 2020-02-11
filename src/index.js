require('dotenv').config();
const rp = require('request-promise');
const { MongoClient } = require('mongodb');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const moment = require('moment');

const { MONGODB_URI, PORT = 5000 } = process.env;

const parseVerdict = verdict => {
  const v = verdict.trim().toLowerCase();
  if (v === 'accepted') return 'AC';
  else if (v.indexOf('time limit')) return 'TLE';
  else if (v.indexOf('memory limit')) return 'MLE';
  else if (v.indexOf('runtime error')) return 'RTE';
  else if (v.indexOf('compilation')) return 'CE';
  else return 'UNKNOWN';
};

(async () => {
  // connect to db
  const client = await new MongoClient(MONGODB_URI, {
    useUnifiedTopology: true
  }).connect();
  const db = client.db();

  // load sheets
  const storedSheets = await db
    .collection('sheets')
    .find({}, { projection: { _id: 0 } })
    .toArray();

  // server stack
  const app = express();
  app.use(cors());
  app.use(morgan('dev'));

  app.get('/parse', async (req, res, next) => {
    try {
      const traineesListJSONUrl = req.query['trainees-list'];
      const sheetsListJSONUrl = req.query['sheets-list'];

      // check links existence
      if (!traineesListJSONUrl || !sheetsListJSONUrl) {
        return res.status(400).json({
          message: 'trainees-list or sheets-list query not found'
        });
      }

      // start fetch json data
      let reqTrainees, reqSheets;
      try {
        const response = await Promise.all([
          rp.get({ uri: traineesListJSONUrl, json: true }),
          rp.get({ uri: sheetsListJSONUrl, json: true })
        ]);
        [reqTrainees, reqSheets] = response;
      } catch (error) {
        return res.status(400).json({
          message: 'invalid trainees-list or sheets-list urls'
        });
      }

      // validate
      reqTrainees = reqTrainees.filter(
        ({ name, handle }) =>
          typeof name === 'string' &&
          name.trim() &&
          typeof handle === 'string' &&
          handle.trim()
      );

      reqSheets = reqSheets.filter(
        sheetId => typeof sheetId === 'string' && sheetId.trim()
      );

      // fetch submissions
      const handles = reqTrainees.map(({ handle }) => handle);
      const storedSubmissions = await db
        .collection('submissions')
        .find(
          {
            contestId: { $in: reqSheets },
            name: { $in: handles }
          },
          {
            projection: {
              _id: 0,
              contestId: 1,
              id: 1,
              name: 1,
              problem: 1,
              verdict: 1
            }
          }
        )
        .toArray();

      // process data
      const sheetsMap = {};
      const sheets = reqSheets.map((sheetId, sheetIndex) => {
        const sheet = storedSheets.find(sheet => sheet.id === sheetId);
        sheetsMap[sheetId] = { sheetIndex };
        return {
          ...sheet,
          problems: sheet.problems.map((problem, problemIndex) => {
            sheetsMap[sheetId][problem.id] = problemIndex;

            return { ...problem, solved: 0 };
          })
        };
      });

      const submissions = {};
      handles.forEach(handle => (submissions[handle] = {}));

      const traineesMap = {};
      const trainees = reqTrainees.map((trainee, index) => {
        traineesMap[trainee.handle] = index;
        return {
          ...trainee,
          states: { solved: 0, tried: 0, submissions: 0 }
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
          verdict: shortVerdict
        };

        if (submissions[handle][uniqueId] === undefined) {
          submissions[handle][uniqueId] = {
            verdict: '',
            triesBeforeAC: 0,
            list: []
          };
          trainees[traineeIndex].states.tried++;
        }

        const obj = submissions[handle][uniqueId];
        if (obj.verdict !== 'AC') {
          if (shortVerdict === 'AC') {
            obj.verdict = 'AC';
            trainees[traineeIndex].states.solved++;
            trainees[traineeIndex].states.tried--;
            sheets[sheetsMap[contestId].sheetIndex].problems[
              sheetsMap[contestId][problemId]
            ].solved++;
          } else {
            obj.triesBeforeAC++;
          }
        }
        trainees[traineeIndex].states.submissions++;
        obj.list.push(submissionListItem);
      }

      // sort first by solved (desc) then by name (asc)
      trainees.sort((t1, t2) => {
        if (t1.states.solved === t2.states.solved) {
          return t1.name.trim().toLowerCase() > t2.name.trim().toLowerCase();
        }
        return t1.states.solved < t2.states.solved;
      });

      // fetch metadata
      const metadata = (
        await db
          .collection('scraper')
          .find({}, { projection: { _id: 0, lastUpdate: 1 } })
          .toArray()
      )[0];

      if (metadata.lastUpdate !== undefined) {
        metadata.lastUpdate = moment(parseInt(metadata.lastUpdate)).fromNow();
      }

      // response
      const response = {
        trainees,
        sheets,
        submissions,
        metadata
      };

      return res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // 404
  app.get('*', (req, res) => {
    res.status(404);
    res.json({ message: 'not found' });
  });

  // 500
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  });

  // start server
  app.listen(PORT, () => console.log(`Server is listening on port ${PORT}!`));
})();
