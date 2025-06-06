export const getHealthSchema = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  },
  response: {
    200: {
      type: 'object',
      properties: {
        profile: { type: 'boolean' },
        auth: { type: 'boolean' },
        game: { type: 'boolean' },
        friends: { type: 'boolean' },
      },
      required: ['profile', 'auth', 'game', 'friends'],
      additionalProperties: false,
    },
  },
};

export const getCheckSchema = {
  response: {
    200: {},
  },
};
