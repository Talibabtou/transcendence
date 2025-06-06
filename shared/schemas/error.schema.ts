export const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    code: { type: 'string' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['statusCode', 'code', 'error', 'message'],
};
