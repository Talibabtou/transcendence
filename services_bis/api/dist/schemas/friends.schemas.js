import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';
export const getFriendsSchema = {
    params: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 36,
                maxLength: 36,
                description: 'Unique identifier (UUID format)'
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
                    friends: {
                        type: 'array',
                        properties: {
                            id: 'string',
                            accepted: 'boolean',
                            created_at: 'string',
                        }
                    }
                },
                required: ['id', 'accepted', 'created_at'],
                additionalProperties: false
            }
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
};
export const getFriendsMeSchema = {
    response: {
        200: {
            body: {
                type: 'object',
                properties: {
                    friends: {
                        type: 'array',
                        properties: {
                            id: 'string',
                            accepted: 'boolean',
                            created_at: 'string',
                        }
                    }
                },
                required: ['id', 'accepted', 'created_at'],
                additionalProperties: false
            }
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
};
export const getCheckSchema = {
    Body: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 36,
                maxLength: 36,
                description: 'Unique identifier (UUID format)'
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
                    friendExists: 'boolean',
                }
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
};
export const postCreateSchema = {
    Body: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 36,
                maxLength: 36,
                description: 'Unique identifier (UUID format)'
            }
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
};
export const patchAcceptSchema = {
    Body: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 36,
                maxLength: 36,
                description: 'Unique identifier (UUID format)'
            }
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
};
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
};
export const deleteFriendSchema = {
    Querystring: {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 36,
                maxLength: 36,
                description: 'Unique identifier (UUID format)'
            }
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
};
