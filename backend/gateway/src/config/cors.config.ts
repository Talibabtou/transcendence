export const corsConfig = {
  origin: [
    'https://localhost:8043',
    'https://localhost:8080',
    'http://localhost:8043',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};
