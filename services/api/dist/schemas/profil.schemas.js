import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';
export const uploadSchema = {
    consumes: ['multipart/form-data'],
    body: {
        type: 'object',
        required: ['file'],
        properties: {
            file: { type: 'string' },
            description: { type: 'string' }
        }
    },
    response: {
        201: {},
        404: {
            ...errorResponseSchema,
            example: ErrorExamples.noFileProvided
        },
        500: {
            ...errorResponseSchema,
            example: ErrorExamples.internalError
        }
    }
};
export const deleteSchema = {
    response: {
        204: {},
        404: {
            ...errorResponseSchema,
            example: ErrorExamples.pictureNotFound
        },
        500: {
            ...errorResponseSchema,
            example: ErrorExamples.internalError
        }
    }
};
