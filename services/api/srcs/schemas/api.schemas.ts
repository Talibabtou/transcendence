import { ErrorExamples } from '../../../shared/constants/error.const.js';
import { errorResponseSchema } from '../../../shared/schemas/error.schema.js';

export const getPicSchema = {
  params: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      }
    },
    required: ['id'],
    additionalProperties: false
  },
  response: {
    200: {
      body: {
      type: 'object',
      properties: {
        link: { type: 'string' }
      },
      required: ['link'],
      additionalProperties: false
    }},
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

export const getPicsSchema = {
  response: {
    200: {
      body: {
      type: 'object',
      properties: {
        links: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['links'],
      additionalProperties: false
    }},
    404: {
      ...errorResponseSchema,
      example: ErrorExamples.pictureNotFound
    },
    500: {
      ...errorResponseSchema,
      example: ErrorExamples.internalError
    }
  }
}