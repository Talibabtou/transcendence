import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

export const eloSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    player: {
      type: 'string',
      format: 'uuid',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    elo: { type: ['integer'], minimum: 0, default: 1000 },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'player', 'elo', 'created_at'],
};

const LeaderboardSchema = {
  type: 'object',
  properties: {
    player: {
      type: 'string',
      format: 'uuid',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    username: { type: 'string' },
    elo: { type: 'integer' },
    victories: { type: 'number' },
    defeats: { type: 'number' },
  },
  required: ['victories', 'defeats', 'elo', 'username', 'player'],
};

export const getEloSchema = {
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
  },
  response: {
    200: eloSchema,
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

export const getLeaderboardSchema = {
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, default: 10 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
    required: [],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'array',
      items: LeaderboardSchema,
    },
  },
};
