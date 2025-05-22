export const swaggerConfig = {
  swagger: {
    info: {
      title: 'Game Service API',
      description: 'API documentation for the Game microservice',
      version: '1.0.0',
    },
    host: `localhost:${process.env.API_PORT || 8085}`,
    schemes: ['http'],
    securityDefinitions: {
      bearerAuth: {
        type: 'apiKey' as const,
        name: 'Authorization',
        in: 'header',
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'auth',
        description: 'Authentication and authorization endpoints',
      },
      {
        name: '2fa',
        description: '2fa authentication endpoints',
      },
      {
        name: 'friends',
        description: 'Endpoints for managing friends and connections',
      },
      {
        name: 'matches',
        description: 'Match management endpoints',
      },
      {
        name: 'goals',
        description: 'Goal tracking endpoints',
      },
      {
        name: 'elos',
        description: 'Elo rating management endpoints',
      },
      {
        name: 'system',
        description: 'System and health check endpoints',
      },
      {
        name: 'profile',
        description: 'User profile management endpoints',
      },
      {
        name: 'tournaments',
        description: 'Tournament management endpoints',
      },
    ],
  },
};

export const swaggerUiConfig = {
  routePrefix: '/documentation',
  uiConfig: { docExpansion: 'list', deepLinking: true } as const,
  staticCSP: true,
};
