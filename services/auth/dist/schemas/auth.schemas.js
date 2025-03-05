export const createUserSchema = {
    type: 'object',
    properties: {
        username: { type: 'string', minLength: 1, maxLength: 21 },
        email: { type: 'string', format: 'email', maxLength: 255 },
        password: { type: 'string', minLength: 7, maxLength: 255 }
    },
    required: ['username', 'password', 'email']
};
export const getIdUserSchema = {
    type: 'object',
    properties: {
        id: { type: 'number' }
    },
    required: ['id']
};
export const loginSchema = {
    type: 'object',
    properties: {
        email: { type: 'string', format: 'email', maxLength: 255 },
        password: { type: 'string', minLength: 7, maxLength: 255 }
    },
    required: ['password', 'email']
};
