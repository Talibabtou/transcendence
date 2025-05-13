import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

export const getPicSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        link: {
          type: 'string',
          description: 'A link to an uploaded picture.',
        },
      },
      required: ['link'],
      additionalProperties: false,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.playerNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

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
