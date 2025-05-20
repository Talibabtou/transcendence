import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

export const matchSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    player_1: { type: 'string', format: 'uuid' },
    player_2: { type: 'string', format: 'uuid' },
    active: { type: 'boolean', default: false },
    duration: { type: ['integer', 'null'], minimum: 0, default: null }, // duration in seconds
    tournament_id: {
      type: ['string', 'null'],
      default: null,
      format: 'uuid',
    },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'player_1', 'player_2', 'active', 'duration', 'tournament_id', 'created_at'],
};

export const getMatchSchema = {
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
    200: matchSchema,
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

export const getMatchesSchema = {
  querystring: {
    type: 'object',
    properties: {
      player_id: { type: 'string', format: 'uuid' },
      active: { type: 'boolean' },
      limit: { type: 'integer', minimum: 1, default: 10 }, //runtime validation
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
    required: ['player_id', 'active'],
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'array',
      items: matchSchema,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const createMatchSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  body: {
    type: 'object',
    properties: {
      player_1: { type: 'string', format: 'uuid' },
      player_2: { type: 'string', format: 'uuid' },
      tournament_id: {
        type: ['string', 'null'],
        default: null,
        format: 'uuid',
      },
      duration: { type: ['integer', 'null'], minimum: 0, default: null },
    },
    required: ['player_1', 'player_2'],
  },
  response: {
    201: matchSchema,
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const updateMatchSchema = {
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
  body: {
    type: 'object',
    properties: {
      active: { type: 'boolean' },
      duration: { type: ['integer', 'null'], minimum: 0 }, // duration in seconds
    },
    required: ['active', 'duration'],
    additionalProperties: false,
  },
  response: {
    200: matchSchema,
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.invalidFields,
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

export const matchSummarySchema = {
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
        total_matches: { type: 'integer', minimum: 0 },
        elo: { type: 'integer', minimum: 0 },
        victories: { type: 'integer', minimum: 0 },
        defeats: { type: 'integer', minimum: 0 },
      },
      required: ['total_matches', 'elo', 'victories', 'defeats'],
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const matchStatsSchema = {
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
        player_id: { type: 'string', format: 'uuid' },
        goal_stats: {
          type: 'object',
          properties: {
            fastest_goal_duration: {
              type: ['integer', 'null'],
              minimum: 0,
            },
            average_goal_duration: {
              type: ['number', 'null'],
              minimum: 0,
            },
            total_goals: { type: 'integer', minimum: 0 },
          },
          required: ['fastest_goal_duration', 'average_goal_duration', 'total_goals'],
        },
        daily_performance: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              match_date: { type: 'string', format: 'date' },
              matches_played: { type: 'integer', minimum: 0 },
              wins: { type: 'integer', minimum: 0 },
              losses: { type: 'integer', minimum: 0 },
              daily_win_ratio: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
            },
            required: ['match_date', 'matches_played', 'wins', 'losses', 'daily_win_ratio'],
          },
        },
        goal_durations: {
          type: 'array',
          items: { type: 'number', minimum: 0 },
        },
        match_durations: {
          type: 'array',
          items: { type: 'number', minimum: 0 },
        },
        elo_history: {
          type: 'array',
          items: { type: 'number', minimum: 0 },
        },
      },
      required: [
        'player_id',
        'goal_stats',
        'daily_performance',
        'goal_durations',
        'match_durations',
        'elo_history',
      ],
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
