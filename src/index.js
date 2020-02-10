const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const rp = require('request-promise');

const parsedSheets = require('./sheets.json');

const { PORT = 5000 } = process.env;

const app = express();
app.use(cors());
app.use(morgan('dev'));

app.get('/parse', async (req, res) => {
  const traineesListJSONUrl = req.query['trainees-list'];
  const sheetsListJSONUrl = req.query['sheets-list'];

  // check links existence
  if (!traineesListJSONUrl || !sheetsListJSONUrl) {
    return res.status(400).json({
      message: 'trainees-list or sheets-list query not found'
    });
  }

  // start fetch json data
  let trainees, sheets;
  try {
    const response = await Promise.all([
      rp.get({ uri: traineesListJSONUrl, json: true }),
      rp.get({ uri: sheetsListJSONUrl, json: true })
    ]);
    [trainees, sheets] = response;
  } catch (error) {
    return res.status(400).json({
      message: 'invalid trainees-list or sheets-list urls'
    });
  }

  // response
  const response = {
    trainees: [],
    sheets: [],
    submissions: {}
  };
  return res.json(response);
});

app.get('*', (req, res) => {
  res.status(404);
  res.json({ message: 'not found' });
});

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}!`));
