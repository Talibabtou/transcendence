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
    // http2: true,
    // https: {
    //   key: fs.readFileSync(path.join(path.resolve(), '/certs/key.pem')),
    //   cert: fs.readFileSync(path.join(path.resolve(), '/certs/cert.pem')),
    // },
};
