import { ErrorExamples } from '../shared/constants/error.const.js';
import { errorResponseSchema } from '../shared/schemas/error.schema.js';
export const summarySchema = {
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
                username: {
                    type: 'string',
                    description: 'The username associated with the summary.',
                },
                id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'The unique identifier of the user.',
                },
                summary: {
                    type: 'object',
                    properties: {
                        total_matches: {
                            type: 'integer',
                            description: 'The total number of matches played by the user.',
                        },
                        victories: {
                            type: 'integer',
                            description: 'The total number of victories by the user.',
                        },
                    },
                    required: ['total_matches', 'victories'],
                    additionalProperties: false,
                    description: 'The match summary of the user.',
                },
                pics: {
                    type: 'object',
                    properties: {
                        link: {
                            type: 'string',
                            format: 'uri',
                            description: 'A link to the user’s profile picture.',
                        },
                    },
                    required: ['link'],
                    additionalProperties: false,
                    description: 'Information about the user’s profile picture.',
                },
            },
            required: ['username', 'id', 'summary', 'pics'],
            additionalProperties: false,
            description: 'A complete summary of the user’s information, including matches and profile picture.',
        },
        404: {
            ...errorResponseSchema,
            example: ErrorExamples.summaryNotFound,
        },
        500: {
            ...errorResponseSchema,
            example: ErrorExamples.internalError,
        },
    },
};
export const getHistorySchema = {
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
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The unique identifier of the goal.',
                                },
                                match_id: {
                                    type: 'string',
                                    description: 'The unique identifier of the match.',
                                },
                                player: {
                                    type: 'string',
                                    description: 'The unique identifier of the player who scored the goal.',
                                },
                                duration: {
                                    type: 'number',
                                    description: 'The time (in seconds) when the goal was scored.',
                                },
                            },
                            required: ['id', 'match_id', 'player', 'duration'],
                        },
                        description: 'The list of goals scored by the first player.',
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
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The unique identifier of the goal.',
                                },
                                match_id: {
                                    type: 'string',
                                    description: 'The unique identifier of the match.',
                                },
                                player: {
                                    type: 'string',
                                    description: 'The unique identifier of the player who scored the goal.',
                                },
                                duration: {
                                    type: 'number',
                                    description: 'The time (in seconds) when the goal was scored.',
                                },
                            },
                            required: ['id', 'match_id', 'player', 'duration'],
                        },
                        description: 'The list of goals scored by the second player.',
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time',
                        description: 'The timestamp when the match was created.',
                    },
                },
                required: ['matchId', 'username1', 'id1', 'goals1', 'username2', 'id2', 'goals2', 'created_at'],
            },
        },
        404: {
            ...errorResponseSchema,
            example: ErrorExamples.matchNotFound,
        },
        500: {
            ...errorResponseSchema,
            example: ErrorExamples.internalError,
        },
    },
};
export const getPicSchema = {
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
                link: {
                    type: 'string',
                    description: 'A link to an uploaded picture.',
                },
            },
            required: ['link'],
            additionalProperties: false,
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
export const uploadSchema = {
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {},
    },
    consumes: ['multipart/form-data'],
    body: {
    // type: 'object',
    // properties: {
    //   file: { type: 'string', format: 'binary' },
    //   description: { type: 'string' },
    // },
    // required: ['file'],
    },
    response: {
        201: {},
        404: {
            ...errorResponseSchema,
            example: ErrorExamples.noFileProvided,
        },
        500: {
            ...errorResponseSchema,
            example: ErrorExamples.internalError,
        },
    },
};
export const deleteSchema = {
    querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {},
    },
    response: {
        204: {},
        404: {
            ...errorResponseSchema,
            example: ErrorExamples.pictureNotFound,
        },
        500: {
            ...errorResponseSchema,
            example: ErrorExamples.internalError,
        },
    },
};
