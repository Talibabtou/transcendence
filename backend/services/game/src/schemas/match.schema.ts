import { errorResponseSchema } from '../../../../shared/schemas/error.schema.js';
import { ErrorExamples } from '../../../../shared/constants/error.const.js';

export const matchSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    player_1: { type: 'string', format: 'uuid' },
    player_2: { type: 'string', format: 'uuid' },
    completed: { type: 'boolean', default: false },
    duration: { type: ['integer', 'null'], minimum: 0, default: null }, // duration in seconds
    timeout: { type: 'boolean', default: false },
    tournament_id: { type: ['string', 'null'], default: null, format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'player_1', 'player_2', 'completed', 'duration', 'timeout', 'tournament_id', 'created_at']
}

export const getMatchSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' }
    },
    required: ['id']
  },
  response: {
    200: matchSchema,
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.matchNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const getMatchesSchema = {
  querystring: {
    type: 'object',
    properties: {
      player_id: { type: 'string', format: 'uuid' },
      completed: { type: 'boolean' },
      limit: { type: 'integer', minimum: 1, default: 10 }, //runtime validation
      offset: { type: 'integer', minimum: 0, default: 0 }
    }
  },
  response: {
    200: {
      type: 'array',
      items: matchSchema
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const createMatchSchema = {
  body: {
    type: 'object',
    properties: {
      player_1: { type: 'string', format: 'uuid' },
      player_2: { type: 'string', format: 'uuid' },
      tournament_id: { type: ['string', 'null'], default: null, format: 'uuid' },
      duration: { type: ['integer', 'null'], minimum: 0, default: null }
    },
    required: ['player_1', 'player_2']
  },
  response: {
    201: matchSchema,
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const updateMatchSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' }
    },
    required: ['id']
  },
  body: {
    type: 'object',
    properties: {
      completed: { type: 'boolean' },
      duration: { type: ['integer', 'null'], minimum: 0 }, // duration in seconds
      timeout: { type: 'boolean' }
    },
    required: ['completed', 'duration', 'timeout'],
    additionalProperties: false
  },
  response: {
    200: matchSchema,
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.invalidFields
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.matchNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const matchTimelineSchema = {
  params: {
    type: 'object',
    properties: {
      match_id: { type: 'string', format: 'uuid' },
			player_id: { type: 'string', format: 'uuid' },
			duration: { type: 'integer', minimum: 0 }
    },
    required: ['match_id', 'player_id', 'duration']
  },
  response: {
    200: matchSchema,
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.invalidFields
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.matchNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const matchStatsSchema = {
  params: {
    type: 'object',
    properties: {
      player_id: { type: 'string', format: 'uuid' }
    },
    required: ['player_id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        player_id: { type: 'string', format: 'uuid' },
        summary: { 
          type: 'object', 
          properties: {
            total_matches: { type: 'integer', minimum: 0 },
            completed_matches: { type: 'integer', minimum: 0 },
            victories: { type: 'integer', minimum: 0 },
            win_ratio: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['total_matches', 'completed_matches', 'victories', 'win_ratio']
        },
        goal_stats: {
          type: 'object',
          properties: {
            fastest_goal_duration: { type: ['integer', 'null'], minimum: 0 },
            average_goal_duration: { type: ['number', 'null'], minimum: 0 },
            total_goals: { type: 'integer', minimum: 0 }
          },
          required: ['fastest_goal_duration', 'average_goal_duration', 'total_goals']
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
              daily_win_ratio: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['match_date', 'matches_played', 'wins', 'losses', 'daily_win_ratio']
          }
        },
        goal_durations: { type: 'array', items: { type: 'number', minimum: 0 } },
        match_durations: { type: 'array', items: { type: 'number', minimum: 0 } },
        elo_history: { 
          type: 'array', 
          items: { 
            type: 'object', 
            properties: {
              match_date: { type: 'string', format: 'date' },
              elo: { type: 'number', minimum: 0 }
            },
            required: ['match_date', 'elo']
          }
        }
      },
      required: ['player_id', 'summary', 'goal_stats', 'daily_performance', 'goal_durations', 'match_durations', 'elo_history']
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.playerNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}
