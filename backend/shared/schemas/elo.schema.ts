import { errorResponseSchema } from './error.schema.js';
import { ErrorExamples } from '../constants/error.const.js';

export const eloSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
    player: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
    elo: { type: ['integer'], minimum: 0, default: 1000 }, // duration in seconds
    created_at: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'player', 'elo', 'created_at']
}


export const getEloSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
    },
    required: ['id']
  },
  response: {
    200: eloSchema,
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

export const getElosSchema = {
  querystring: {
    type: 'object',
    properties: {
      player: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
      limit: { type: 'integer', minimum: 1, default: 10 },
      offset: { type: 'integer', minimum: 0, default: 0 }
    }
  },
  response: {
    200: {
      type: 'array',
      items: eloSchema
    },
		500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const createEloSchema = {
  body: {
    type: 'object',
    properties: {
      player: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
			elo: { type: ['integer'], minimum: 0, default: 1000 },
		},
    required: ['player', 'elo']
  },
  response: {
    201: eloSchema,
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

export const updatePlayerEloSchema = {
  body: {
    type: 'object',
    properties: {
      winner: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
      loser: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' },
    },
    required: ['winner', 'loser']
  },
  response: {
    200: {
      type: 'object',
      properties: {
        winner: eloSchema,
        loser: eloSchema
      },
      required: ['winner', 'loser']
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

export const getLeaderboardSchema = {
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, default: 10 },
			offset: { type: 'integer', minimum: 0, default: 0 }
    }
  },
  response: {
    200: {
      type: 'array',
      items: eloSchema
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}