import mongoose from 'mongoose';
import { duplicateKeyErrorHandler } from './plugins';

mongoose.plugin(duplicateKeyErrorHandler);

export async function openMongooseConnection(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    console.log(`connected to MongoDB.`);
  } catch (e) {
    console.log(`Failed to connect to MongoDB.\n${e}`);
    process.exit(1);
  }
}
