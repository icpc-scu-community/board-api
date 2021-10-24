import { MongoError, MongoBulkWriteError } from 'mongodb';
import { Document, Schema } from 'mongoose';
import { DuplicateKeyError } from '../errors';

const DUPLICATE_KEY_ERROR_CODE = 11000;

function handleE11000(error: Error, _: Document, next: (e?: Error) => void) {
  if (error) {
    if ((error as MongoError).code === DUPLICATE_KEY_ERROR_CODE) {
      const duplicateKeyError = new DuplicateKeyError(error.message);
      if (error.name === MongoBulkWriteError.name) {
        duplicateKeyError.nInserted = (error as MongoBulkWriteError).result.result.nInserted;
      }
      next(duplicateKeyError);
    } else {
      next(error);
    }
  } else {
    next();
  }
}

export default function (schema: Schema): void {
  schema.post('save', handleE11000);
  schema.post('update', handleE11000);
  schema.post('findOneAndUpdate', handleE11000);
  schema.post('insertMany', handleE11000);
}
