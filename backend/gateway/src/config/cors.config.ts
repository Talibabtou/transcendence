export const corsConfig = {
  origin: [
    'https://localhost:8047',
    'https://localhost:8085',
    'https://localhost:8080',
    'http://localhost:8047',
    'http://localhost:8085',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};