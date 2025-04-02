export const getUserSchema = {
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

export const createUserSchema = {
  body: {
    type: 'object',
    properties: {
      username: { 
        type: 'string', 
        minLength: 3, 
        maxLength: 20,
        description: 'Unique username for the user, must be between 3-20 characters'
      },
      email: { 
        type: 'string', 
        format: 'email', 
        maxLength: 255,
        description: 'Valid email address for the user, maximum 255 characters'
      },
      password: {
        type: 'string',
        minLength: 8,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$',
        maxLength: 255,
        description: 'Secure password with minimum 8 characters, at least one uppercase letter, one lowercase letter, and one digit'
      }
    },
    required: ['username', 'password', 'email'],
    additionalProperties: false,
    description: 'Schema for creating a new user account'
  }
};

export const loginSchema = {
  body: {
    type: 'object',
    properties: {
      email: { 
        type: 'string', 
        format: 'email', 
        maxLength: 255,
        description: 'Registered email address for login'
      },
      password: { 
        type: 'string',
        minLength: 8,
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$',
        maxLength: 255,
        description: 'User\'s password for authentication'
      }
    },
    required: ['password', 'email'],
    additionalProperties: false,
    description: 'Schema for user login authentication'
  }
};

export const modifyUserSchema  = {
  body: {
    type: 'object',
    oneOf: [
      {
        properties: {
          username: { 
            type: 'string', 
            minLength: 3, 
            maxLength: 20,
            description: 'New username to update, must be between 3-20 characters'
          },
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
            maxLength: 255,
            description: 'New secure password to update, must meet complexity requirements'
          },
        },
        required: ['password'],
        additionalProperties: false,
      },
      {
        properties: {
          email: { 
            type: 'string', 
            format: 'email', 
            maxLength: 255,
            description: 'New email address to update, must be valid'
          },
        },
        required: ['email'],
        additionalProperties: false,
      },
    ],
    description: 'Schema for modifying user profile information (username, password, or email)'
  }
};
