export const getIdUserSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string', maxLength: 36, minLength: 36 }
        },
        required: ['id'],
        additionalProperties: false,
    }
};
