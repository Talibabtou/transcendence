import { errorResponseSchema } from './error.schema.js';
import { ErrorExamples } from '../constants/error.const.js';
import { matchSchema } from './match.schema.js'

export const getTournamentSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'array',
      items: matchSchema
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.tournamentNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const getFinalMatchesSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' }
    },
    required: ['id']
  },
  response: {
    200: {
      type: 'object',
      properties: {
          player_1: { type: 'string', format: 'uuid' },
          player_2: { type: 'string', format: 'uuid' }
        }
      }
    },
		400: {
			...errorResponseSchema,
			example: ErrorExamples.tournamentWrongMatchCount
		},
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.tournamentNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }


