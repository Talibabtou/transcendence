import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

export const uploadSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    properties: {
      file: { type: 'string', format: 'binary' },
      description: { type: 'string' },
    },
    required: ['file'],
  },
  response: {
    201: {},
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.noFileProvided,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const deleteSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    204: {},
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.pictureNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};
