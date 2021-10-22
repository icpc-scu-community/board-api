import joi from 'joi';
import { HttpException, UNPROCESSABLE_ENTITY } from './core';
import { toErrorResponse } from './core/decorators/validationHandler';

export const urlValidator = joi.string().uri().required();

export const traineesListValidator = joi
  .array()
  .items(joi.object({ name: joi.string().required(), handle: joi.string().required() }).required())
  .unique('handle')
  .min(1)
  .required();

export const sheetsListValidator = joi.array().items(joi.number().required()).unique().min(1).required();

/**
 * validates the value according to the schema
 *
 * throws HttpException on validation errors
 * @param schema the schema used in validation
 * @param data the value to validate
 */
export function validate(schema: joi.PartialSchemaMap<any>, value: any) {
  const { error } = joi.object(schema).validate(value);

  if (error) {
    const errors = toErrorResponse(error.details);
    throw new HttpException(UNPROCESSABLE_ENTITY, {
      message: 'validation error',
      errors,
    });
  }
}
