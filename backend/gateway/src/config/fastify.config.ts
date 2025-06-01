import fs from 'fs';

export const fastifyConfig = {
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  },
  bodyLimit: 1024 * 1024,
  https: {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || '/etc/certs/nginx.key'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || '/etc/certs/nginx.crt'),
  },
};
