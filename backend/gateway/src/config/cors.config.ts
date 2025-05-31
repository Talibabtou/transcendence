export const corsConfig = {
  origin: [
    `https://localhost:${process.env.HTTPS_PORT || 8043}`,
    `http://localhost:${process.env.HTTP_PORT || 8080}`
  ],
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};