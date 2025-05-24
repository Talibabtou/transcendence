import path from "path";
import fs from "fs";

const keyPath = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;

if (!keyPath || !certPath) {
  console.error('SSL_KEY_PATH or SSL_CERT_PATH environment variable is not set. HTTPS will not be enabled or the server may fail to start.');
  // Depending on your desired behavior, you could throw an error:
  // throw new Error('SSL certificate paths not configured via environment variables.');
  // Or, you might have a fallback or disable https if that's acceptable.
  // For this setup, throwing an error if they're missing is often preferred
  // as HTTPS is an explicit requirement.
}

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
  bodyLimit: 1024 * 1024, // 1 Mo
  http2: true,
  https: (keyPath && certPath) ? {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  } : undefined,
};
