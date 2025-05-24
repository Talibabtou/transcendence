import { errorResponseSchema } from '../shared/schemas/error.schema.js';
import { ErrorExamples } from '../shared/constants/error.const.js';
import { matchSchema } from './match.schemas.js';

export const getTournamentSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      limit: {
        type: 'integer',
        description: 'The number of matches to return.',
      },
      offset: {
        type: 'integer',
        description: 'The number of matches to skip.',
      },
    },
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
      items: {
        type: 'object',
        properties: {
          matchId: {
            type: 'string',
            description: 'The unique identifier of the match.',
          },
          username1: {
            type: 'string',
            description: 'The username of the first player.',
          },
          id1: {
            type: 'string',
            description: 'The unique identifier of the first player.',
          },
          goals1: {
            type: ['number', 'string'],
            description: 'The number of goals scored by the first player.',
          },
          username2: {
            type: 'string',
            description: 'The username of the second player.',
          },
          id2: {
            type: 'string',
            description: 'The unique identifier of the second player.',
          },
          goals2: {
            type: ['number', 'string'],
            description: 'The number of goals scored by the second player.',
          },
					winner: {
						type: 'string',
						description: 'The winner of the match.',
					},
					final: {
						type: 'boolean',
						description: 'Whether the match is a final of a tournament.',
					},
          created_at: {
            type: 'string',
            description: 'The timestamp when the match was created.',
          },
        },
        required: ['matchId', 'username1', 'id1', 'goals1', 'username2', 'id2', 'goals2', 'winner', 'final', 'created_at'],
      },
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
