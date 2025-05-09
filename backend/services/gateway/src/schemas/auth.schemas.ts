import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';

export const getUserSchema = {
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
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        id: {
          type: 'string',
          format: 'uuid',
          pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
      },
      required: ['username', 'email', 'id'],
      additionalProperties: false,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.playerNotFound,
    },
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.sqliteMismatch,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const getUserMeSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        id: {
          type: 'string',
          format: 'uuid',
          pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
      },
      required: ['username', 'email', 'id'],
      additionalProperties: false,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.playerNotFound,
    },
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.sqliteMismatch,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const getUsersSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {
      type: 'array',
      item: {
        type: 'object',
        properties: {
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          id: {
            type: 'string',
            format: 'uuid',
            pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
          },
        },
        required: ['username', 'email', 'id'],
        additionalProperties: false,
      },
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

export const deleteUserSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    204: {},
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.sqliteMismatch,
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

export const createUserSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  body: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        minLength: 3,
        maxLength: 20,
        description: 'Unique username for the user, must be between 3-20 characters',
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
        description: 'Valid email address for the user, maximum 255 characters',
      },
      passwordHash: {
        type: 'string',
        pattern: '^[a-f0-9]{64}$',
        description: 'Hash SHA-256',
      },
    },
    required: ['username', 'password', 'email'],
    additionalProperties: false,
    description: 'Schema for creating a new user account',
  },
  response: {
    201: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        id: {
          type: 'string',
          format: 'uuid',
          pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
      },
      required: ['username', 'email', 'id'],
      additionalProperties: false,
    },
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.sqliteMismatch,
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

export const logoutSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    204: {},
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const loginSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  body: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
        description: 'Registered email address for login',
      },
      passwordHash: {
        type: 'string',
        pattern: '^[a-f0-9]{64}$',
        description: 'Hash SHA-256',
      },
    },
    required: ['password', 'email'],
    additionalProperties: false,
    description: 'Schema for user login authentication',
  },
  response: {
    200: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          pattern: '^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$',
          description: 'JWT token for user authentication',
        },
        id: {
          type: 'string',
          format: 'uuid',
          pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        },
        role: { type: 'string' },
        username: { type: 'string' },
        status: { type: 'string' },
      },
      required: ['token'],
      additionalProperties: false,
    },
    401: {
      ...errorResponseSchema,
      example: ErrorExamples.loginFailure,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const modifyUserSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  body: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        minLength: 3,
        maxLength: 20,
        description: 'New username to update, must be between 3-20 characters',
      },
      password: {
        type: 'string',
        minLength: 8,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$',
        maxLength: 255,
        description: 'New secure password to update, must meet complexity requirements',
      },
      email: {
        type: 'string',
        format: 'email',
        maxLength: 255,
        description: 'New email address to update, must be valid',
      },
    },
    additionalProperties: false,
    required: [],
    anyOf: [{ required: ['username'] }, { required: ['password'] }, { required: ['email'] }],
    not: {
      anyOf: [
        { required: ['username', 'password'] },
        { required: ['username', 'email'] },
        { required: ['password', 'email'] },
      ],
    },
    description:
      'Schema for modifying user profile information (username, password, or email). Only one property can be provided at a time.',
  },
  response: {
    200: {},
    400: {
      ...errorResponseSchema,
      example: ErrorExamples.sqliteMismatch,
    },
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.playerNotFound,
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

export const twofaDisableSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {},
    204: {},
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const twofaValidateSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  body: {
    type: 'object',
    properties: {
      twofaCode: {
        type: 'string',
        minLength: 6,
        maxLength: 6,
      },
    },
    additionalProperties: false,
    required: ['twofaCode'],
  },
  response: {
    200: {},
    401: {
      ...errorResponseSchema,
      example: ErrorExamples.twofaBadCode,
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};

export const twofaGenerateSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {
      type: 'object',
      properties: {
        qrcode: {
          type: 'string',
        },
        otpauth: {
          type: 'string',
        },
      },
      required: ['qrcode', 'otpauth'],
      additionalProperties: false,
    },
    204: {},
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError,
    },
  },
};
