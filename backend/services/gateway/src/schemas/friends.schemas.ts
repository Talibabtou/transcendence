import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

const friendsSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    },
    username: { type: 'string' },
    accepted: { type: 'boolean' },
    pic: { type: 'string' },
    created_at: { type: 'string' },
  },
  required: ['id', 'accepted', 'created_at'],
  additionalProperties: false,
};

export const getFriendsSchema = {
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
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'array',
      items: friendsSchema,
    },
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.badRequest,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.friendshipNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const getFriendsMeSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {
      type: 'array',
      items: friendsSchema,
    },
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.badRequest,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.friendshipNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const getStatusSchema = {
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
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        status: {
          type: 'boolean',
        },
        requesting: {
          type: 'string',
          format: 'uuid',
          pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
      },
      required: ['status'],
    },
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.badRequest,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.friendshipNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const postCreateSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  body: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      },
    },
    additionalProperties: false,
    required: ['id'],
  },
  response: {
    201: {},
    400: {
      oneOf: [
        {
          ...errorResponseSchema,
          example: ErrorExamples.badRequest,
        },
        {
          ...errorResponseSchema,
          example: ErrorExamples.sqliteMismatch,
        },
      ],
    },
    409: {
      ...errorResponseSchema,
      example: ErrorExamples.sqliteConstraint,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const patchAcceptSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  body: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  response: {
    204: {},
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.badRequest,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.friendshipNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const deleteAllSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    204: {},
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.friendshipNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const deleteFriendSchema = {
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
    additionalProperties: false,
  },
  response: {
    204: {},
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.badRequest,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.friendshipNotFound,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};
