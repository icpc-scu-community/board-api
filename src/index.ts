import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import getData from './controllers/getData';
import { HttpException, NOT_FOUND } from './core';
import exceptionHandler from './core/exceptionHandler';
import { openMongooseConnection } from './database/mongoose';
import env from './env';

const { PORT = 5000 } = process.env;

(async () => {
  await openMongooseConnection(env('MONGODB_URI'));

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(morgan('dev'));

  app.get('/', getData);

  app.use('*', () => {
    throw new HttpException(NOT_FOUND, { message: 'Not Found' });
  });

  app.use(exceptionHandler);

  // start server
  app.listen(PORT, () => console.log(`Server is listening on port ${PORT}!`));
})();
