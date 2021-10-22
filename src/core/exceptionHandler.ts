import { NextFunction, Request, Response } from 'express';
import { HttpException, SERVER_ERROR } from '../core';

// error handler middleware MUST have 4 parameters: error, req, res, next. Otherwise your handler won't fire.
// https://stackoverflow.com/a/61464426
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function exceptionHandler(err: HttpException, _req: Request, res: Response, _: NextFunction): Response {
  const { errors, status = SERVER_ERROR, stack } = err;
  let message = err.message === '' ? undefined : err.message; // no empty messages
  if (status >= SERVER_ERROR) {
    message = 'Internal server error'; // always general message, NEVER expose the error
    console.error(stack);
  }
  return res.status(status).json({ message, errors });
}
