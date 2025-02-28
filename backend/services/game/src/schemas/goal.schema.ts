export const goalSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    match_id: { type: 'string', format: 'uuid' },
    player: { type: 'string', format: 'uuid' },
    duration: { type: ['integer', 'null'], minimum: 0, default: null }, // duration in seconds
    created_at: { type: 'string', format: 'date-time' }
  },
  required: ['match_id', 'player']
}

export const createGoalSchema = {
  body: {
    type: 'object',
    properties: {
      match_id: { type: 'string', format: 'uuid' },
      player: { type: 'string', format: 'uuid' },
      duration: { type: ['integer', 'null'], minimum: 0, default: null }
    },
    required: ['match_id', 'player']
  },
  response: {
    201: goalSchema
  }
}

export const getGoalSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' }
    },
    required: ['id']
  },
  response: {
    200: goalSchema
  }
}

export const getGoalsSchema = {
  querystring: {
    type: 'object',
    properties: {
      match_id: { type: 'string', format: 'uuid' },
      player: { type: 'string', format: 'uuid' },
      limit: { type: 'integer', minimum: 1, default: 10 },
      offset: { type: 'integer', minimum: 0, default: 0 }
    }
  },
  response: {
    200: {
      type: 'array',
      items: goalSchema
    }
  }
}
