import { errorResponseSchema } from '../../../../shared/schemas/error.schema.js';

export const goalSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
    match_id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
    player: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
    duration: { type: ['integer', 'null'], minimum: 0, default: null }, // duration in seconds
    created_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'match_id', 'player', 'duration', 'created_at']
}

export const createGoalSchema = {
  body: {
    type: 'object',
    properties: {
      match_id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
      player: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
      duration: { type: ['integer'], minimum: 0}
    },
    required: ['match_id', 'player', 'duration']
  },
  response: {
    201: goalSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const getGoalSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
    },
    required: ['id']
  },
  response: {
    200: goalSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  }
}

export const getGoalsSchema = {
  querystring: {
    type: 'object',
    properties: {
      match_id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
      player: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
      limit: { type: 'integer', minimum: 1, default: 10 },
      offset: { type: 'integer', minimum: 0, default: 0 }
    }
  },
  response: {
    200: {
      type: 'array',
      items: goalSchema
    },
    400: errorResponseSchema,
    500: errorResponseSchema
  }
}
