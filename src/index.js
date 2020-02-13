require("dotenv").config();
const { promisify } = require("util");
const moment = require("moment");
const rp = require("request-promise");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const redis = require("redis");
const { MongoClient } = require("mongodb");
const { parseVerdict } = require("./utils");

const { MONGODB_URI, REDIS_URL, PORT = 5000 } = process.env;

(async () => {
  // config redius
  let redisClient, rGetAsync, rSetAsync;
  if (REDIS_URL) {
    redisClient = redis.createClient(REDIS_URL);
    redisClient.on("error", error => {
      console.error(error.stack);
      process.exit(1);
    });

    rGetAsync = promisify(redisClient.get).bind(redisClient);
    rSetAsync = promisify(redisClient.set).bind(redisClient);
  }

  // connect to db
  const client = await new MongoClient(MONGODB_URI, {
    useUnifiedTopology: true
  }).connect();
  const db = client.db();

  // load sheets
  const storedSheets = await db
    .collection("sheets")
    .find({}, { projection: { _id: 0 } })
    .toArray();

  // server stack
  const app = express();
  app.use(cors());
  app.use(morgan("dev"));

  app.get("/parse", async (req, res, next) => {
    try {
      // fetch metadata
      const metadata = await db.collection("scrapers").findOne({}, { projection: { _id: 0, lastUpdate: 1 } });
      const lastUpdate = metadata ? metadata.lastUpdate : "N/A";
      if (metadata && metadata.lastUpdate !== undefined) {
        metadata.lastUpdate = moment(parseInt(metadata.lastUpdate)).fromNow();
      } else {
        metadata = { lastUpdate: "N/A" };
      }

      // query links
      const traineesListJSONUrl = req.query["trainees-list"];
      const sheetsListJSONUrl = req.query["sheets-list"];
      // check links existence
      if (!traineesListJSONUrl || !sheetsListJSONUrl) {
        return res.status(400).json({
          message: "trainees-list or sheets-list query not found"
        });
      }

      // stop early (return cached version if possible)
      const HASH_KEY = `${lastUpdate}-${traineesListJSONUrl}-${sheetsListJSONUrl}`;
      if (REDIS_URL) {
        const redis_response = await rGetAsync(HASH_KEY);
        if (redis_response) {
          return res.json({ ...JSON.parse(redis_response), metadata }); // not cached metadata
        }
      }

      // start fetch json data
      let reqTrainees, reqSheets;
      try {
        const response = await Promise.all([rp.get({ uri: traineesListJSONUrl, json: true }), rp.get({ uri: sheetsListJSONUrl, json: true })]);
        [reqTrainees, reqSheets] = response;
      } catch (error) {
        return res.status(400).json({
          message: "invalid trainees-list or sheets-list urls"
        });
      }

      // validate (filter)
      reqTrainees = reqTrainees.filter(
        ({ name, handle }) => typeof name === "string" && name.trim() !== "" && typeof handle === "string" && handle.trim() !== ""
      );

      reqSheets = reqSheets.filter(sheetId => typeof sheetId === "string" && sheetId.trim() !== "");

      // fetch submissions
      const handlesRegExps = reqTrainees.map(({ handle }) => new RegExp(`^${handle}$`, "i"));
      const storedSubmissions = await db
        .collection("submissions")
        .find(
          {
            contestId: { $in: reqSheets },
            name: { $in: handlesRegExps }
          },
          {
            projection: { _id: 0, contestId: 1, id: 1, name: 1, problem: 1, verdict: 1 }
          }
        )
        .toArray();

      // unique array of handles from the stored submissions to avoid letters case issue
      const correctHandles = [...new Set(storedSubmissions.map(({ name }) => name))];

      // process data
      // 1. sheets
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

      // 2. submissions
      const submissions = {};
      correctHandles.forEach(handle => (submissions[handle] = {}));

      // 3. trainees
      const traineesMap = {};
      const trainees = reqTrainees.map((trainee, index) => {
        const handle = correctHandles.find(correctHandle => correctHandle.toLowerCase() === trainee.handle.toLowerCase()) || trainee.handle;
        traineesMap[handle] = index;

        return {
          ...trainee,
          handle,
          states: { solved: 0, tried: 0, submissions: 0 }
        };
      });

      for (let i = 0; i < storedSubmissions.length; i++) {
        const sub = storedSubmissions[i];
        const { id: submissionId, contestId, name: handle, verdict } = sub;
        const problemId = sub.problem.split(" - ")[0];

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
            verdict: "",
            triesBeforeAC: 0,
            list: []
          };
          trainees[traineeIndex].states.tried++;
        }

        const obj = submissions[handle][uniqueId];
        if (obj.verdict !== "AC") {
          if (shortVerdict === "AC") {
            obj.verdict = "AC";
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

      // sort first by solved (desc)
      // => if solved==0, sort by who tried more. else by who tried less
      // then by name (asc)
      const smaller_first = (num1, num2) => (num1 < num2 ? -1 : num1 > num2 ? 1 : 0);
      const greater_first = (num1, num2) => smaller_first(num2, num1);

      trainees.sort((t1, t2) => {
        if (t1.states.solved !== t2.states.solved) return greater_first(t1.states.solved, t2.states.solved);
        // t1_solved === t2_solved === 0
        if (t1.states.solved === 0) return greater_first(t1.states.submissions, t2.states.submissions);
        // t1_solved === t2_solved !== 0
        if (t1.states.submissions !== t2.states.submissions) return smaller_first(t1.states.submissions, t2.states.submissions);
        // t1_solved === t2_solved && t1_submissions === t2_submissions
        return t1.name
          .trim()
          .toLowerCase()
          .localeCompare(t2.name.trim().toLowerCase());
      });

      // response
      const response = {
        trainees,
        sheets,
        submissions,
        metadata
      };

      // cache (if possible)
      if (REDIS_URL) {
        await rSetAsync(HASH_KEY, JSON.stringify(response));
      }

      return res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // 404
  app.get("*", (req, res) => {
    res.status(404);
    res.json({ message: "Not found" });
  });

  // 500
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
  });

  // start server
  app.listen(PORT, () => console.log(`Server is listening on port ${PORT}!`));
})();
