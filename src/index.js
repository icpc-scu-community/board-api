const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const { PORT = 5000 } = process.env;

const app = express();
app.use(cors());
app.use(morgan('dev'));

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}!`));
