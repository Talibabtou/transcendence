import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

export const goalSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    match_id: {
      type: 'string',
      format: 'uuid',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    player: {
      type: 'string',
      format: 'uuid',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    duration: { type: ['integer', 'null'], minimum: 0, default: null }, // duration in seconds
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'match_id', 'player', 'duration', 'created_at'],
};

export const getGoalSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {}
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
    200: goalSchema,
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.goalNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const getGoalsSchema = {
  querystring: {
    type: 'object',
    properties: {
      match_id: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      },
      player: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      },
      limit: { type: 'integer', minimum: 1, default: 10 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
    required: ['player', 'limit', 'offset'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'array',
      items: goalSchema,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const createGoalSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {}
  },
  body: {
    type: 'object',
    properties: {
      match_id: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      },
      duration: { type: ['integer'], minimum: 0 },
    },
    required: ['match_id', 'player', 'duration'],
  },
  response: {
    201: goalSchema,
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.playerNotInMatch,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.matchNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};
