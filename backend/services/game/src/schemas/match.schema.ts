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
    201: matchSchema
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
    200: matchSchema
  }
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
    200: matchSchema
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
    }
  }
}
