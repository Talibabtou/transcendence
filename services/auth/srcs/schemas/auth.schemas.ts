export const createUserSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 20 },
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: {
      type: 'string',
      minLength: 8,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$',
      maxLength: 255
    } // Autorise only password with minimum one upper case letter, one lower case and one digit with a minimum length of 8
  },
  required: ['username', 'password', 'email'],
  additionalProperties: false,
};

export const getIdUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36, minLength: 36 }
  },
  required: ['id'],
  additionalProperties: false,
};

export const loginSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string',
      minLength: 8,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$',
      maxLength: 255 
    } // Autorise only password with minimum one upper case letter, one lower case and one digit with a minimum length of 8
  },
  required: ['password', 'email'],
  additionalProperties: false,
};

export const modifyUserSchema  = {
    type: 'object',
    oneOf: [
    {
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 20 },
      },
      required: ['username'],
      additionalProperties: false,
    },
    {
      properties: {
        password: {
          type: 'string',
          minLength: 8,
          pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$',
          maxLength: 255
        }, // Autorise only password with minimum one upper case letter, one lower case and one digit with a minimum length of 8
      },
      required: ['password'],
      additionalProperties: false,
    },
    {
      properties: {
        email: { type: 'string', format: 'email', maxLength: 255 },
      },
      required: ['email'],
      additionalProperties: false,
    },
  ],
};
