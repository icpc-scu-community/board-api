import joi from 'joi';
import { HttpException, UNPROCESSABLE_ENTITY } from './core';
import { toErrorResponse } from './core/decorators/validationHandler';

export const urlValidator = joi.string().uri().required();

const traineesListValidator = joi
  .array()
  .items(
    joi
      .object({
        name: joi.string().trim().required(),
        // transform trainees handles to lowercase & trim (convert is enabled)
        // handles are always stored as lowercase in DB
        handle: joi.string().lowercase().trim().required(),
      })
      .required(),
  )
  .unique('handle')
  .min(1)
  .required();

const groupsListValidator = joi
  .array()
  .items(
    joi.object({
      id: joi.string().lowercase().trim().required(),
      contests: joi.array().items(joi.number().integer().required()).required().min(1).unique(),
    }),
  )
  .unique('id')
  .required();

export const configsValidator = {
  groups: groupsListValidator,
  trainees: traineesListValidator,
  metadata: joi.object({ boardName: joi.string().trim().required() }).required(),
};

/**
 * validates the data according to the schema
 *
 * @returns the value after converting it to the valid schema if possible, otherwise throws an error
 * @throws HttpException on validation errors
 * @param schema the schema used in validation
 * @param data the data to validate
 */
export function validate<T>(schema: joi.PartialSchemaMap, data: T): T {
  // https://joi.dev/api/?v=17.4.2#anyvalidatevalue-options
  // convert option is enabled by default
  // convert => attempts to cast values to the required types (e.g. a string to a number, string tolowercase, string trim)
  // value - the validated and normalized (converted) value
  const { error, value } = joi.object(schema).validate(data);
  if (error) {
    const errors = toErrorResponse(error.details);
    throw new HttpException(UNPROCESSABLE_ENTITY, {
      message: 'validation error',
      errors,
    });
  }
  return value; // return data after validating and converting it if needed
}
