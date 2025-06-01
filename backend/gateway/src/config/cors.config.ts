export const corsConfig = {
  origin: [
    `https://localhost:${process.env.HTTPS_PORT}`,
  ],
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};