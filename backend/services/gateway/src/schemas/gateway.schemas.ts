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

export const getPicsSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {
      type: 'object',
      properties: {
        links: { type: 'array' },
        items: {
          link: {
            type: 'string',
            description: 'A link to an uploaded picture.',
          },
        },
      },
      required: ['links'],
      additionalProperties: false,
    },
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

export const getHealthSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {
      type: 'object',
      properties: {
        profil: { type: 'boolean' },
        auth: { type: 'boolean' },
        game: { type: 'boolean' },
        friends: { type: 'boolean' },
      },
      required: ['profil', 'auth', 'game', 'friends'],
      additionalProperties: false,
    },
  },
};

export const getCheckSchema = {
  response: {
    200: {},
  },
};
