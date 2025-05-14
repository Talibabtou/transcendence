import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

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
