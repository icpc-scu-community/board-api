import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import getData from './controllers/getData';
import exceptionHandler from './core/exceptionHandler';

const { PORT = 5000 } = process.env;

(async () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(morgan('dev'));

  app.get('/', getData);

  app.use('*', (_, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use(exceptionHandler);

  // start server
  app.listen(PORT, () => console.log(`Server is listening on port ${PORT}!`));
})();
