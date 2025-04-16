import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

const friendsSchema = {
  type: 'object',
    properties: {
      id: { type: 'string' },
      accepted: { type: 'boolean' },
      created_at: { type: 'string' },
  },
  required: ['id', 'accepted', 'created_at'],
  additionalProperties: false
}


export const getFriendsSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
    },
    required: ['id'],
    additionalProperties: false
  },
  response: {
    200: {
      type: 'array',
      items: friendsSchema
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.friendshipNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}

export const getFriendsMeSchema = {
    response: {
        200: {
          type: 'array',
          items: friendsSchema
        },
      404: {
        ...errorResponseSchema,
        example: ErrorExamples.friendshipNotFound
      },
      500: {
        ...errorResponseSchema,
        example: ErrorExamples.internalError
      }
    }
  }

export const getCheckSchema = {
    Body: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
      },
      required: ['id'],
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',
        properties: {
          friendExists: { type: 'boolean' },
        },
        required: ['friendExists'],
        additionalProperties: false
      },
      404: {
        ...errorResponseSchema,
        example: ErrorExamples.friendshipNotFound
      },
      400: {
        ...errorResponseSchema,
        example: ErrorExamples.badRequest
      },
      500: {
        ...errorResponseSchema,
        example: ErrorExamples.internalError
      }
    }
  }

export const postCreateSchema = {
    Body: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
      },
      required: ['id'],
      additionalProperties: false
    },
    response: {
      201: {},
      400: {
        ...errorResponseSchema,
        example: ErrorExamples.sqliteMismatch
      },
      409: {
        ...errorResponseSchema,
        example: ErrorExamples.sqliteConstraint
      },
      500: {
        ...errorResponseSchema,
        example: ErrorExamples.internalError
      }
    }
  }

export const patchAcceptSchema = {
    Body: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
      },
      required: ['id'],
      additionalProperties: false
    },
    response: {
      204: {},
      400: {
        ...errorResponseSchema,
        example: ErrorExamples.badRequest
      },
      404: {
        ...errorResponseSchema,
        example: ErrorExamples.friendshipNotFound
      },
      500: {
        ...errorResponseSchema,
        example: ErrorExamples.internalError
      }
    }
  }

export const deleteAllSchema = {
    response: {
      204: {},
      404: {
        ...errorResponseSchema,
        example: ErrorExamples.friendshipNotFound
      },
      500: {
        ...errorResponseSchema,
        example: ErrorExamples.internalError
      }
    }
  }

export const deleteFriendSchema = {
    Querystring: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
        },
        required: ['id'],
        additionalProperties: false
    },
    response: {
      204: {},
      404: {
        ...errorResponseSchema,
        example: ErrorExamples.friendshipNotFound
      },
      500: {
        ...errorResponseSchema,
        example: ErrorExamples.internalError
      }
    }
  }

