export const getIdSchema = {
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
    }
};
