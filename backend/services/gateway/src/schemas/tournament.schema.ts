import { errorResponseSchema } from '../shared/schemas/error.schema.js';
import { ErrorExamples } from '../shared/constants/error.const.js';
import { matchSchema } from './match.schemas.js';

export const getTournamentSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'array',
      items: matchSchema,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.tournamentNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const getFinalMatchesSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        player_1: { type: 'string', format: 'uuid' },
        player_2: { type: 'string', format: 'uuid' },
      },
    },
  },
  400: {
    ...errorResponseSchema,
    example: ErrorExamples.tournamentWrongMatchCount,
  },
  404: {
    ...errorResponseSchema,
    example: ErrorExamples.tournamentNotFound,
  },
  500: {
    ...errorResponseSchema,
    example: ErrorExamples.internalError,
  },
};
