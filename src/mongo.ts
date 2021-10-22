import { MongoClient } from 'mongodb';
import env from './env';

const MONGODB_URI = env('MONGODB_URI');
const db = createMongoClient().db();

function createMongoClient() {
  const client = new MongoClient(MONGODB_URI);
  client
    .connect()
    .then(() => console.log('connected to MongoDB!'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
  return client;
}

export default db;
