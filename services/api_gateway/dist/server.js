import fastify from 'fastify';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authSchema } from './modules/schema.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const server = fastify.fastify({
    logger: true,
    http2: true,
    https: {
        key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem'))
    }
});
server.get('/', (request, reply) => {
    const isHttps = request.protocol === 'https';
    return reply.code(200).send({
        hello: "world",
        isHttps: isHttps
    });
});
server.post('/auth/*', async (request, reply) => {
    try {
        const isHttps = request.protocol === 'https';
        const parsedRequest = authSchema.parse(request.query);
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedRequest)
        });
        const responseData = await response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
});
server.get('/auth/*', async (request, reply) => {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            body: request.body
        });
        const responseData = await response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
});
server.delete('/auth/*', async (request, reply) => {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `http://localhost:8082`;
        const response = await fetch(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.query
        });
        const responseData = await response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
});
server.post('/game/*', async (request, reply) => {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://localhost:8083`;
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.query
        });
        const responseData = await response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
});
server.get('/game/*', async (request, reply) => {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://localhost:8083`;
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.body
        });
        const responseData = await response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
});
server.delete('/game/*', async (request, reply) => {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `http://localhost:8083`;
        const response = await fetch(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.query
        });
        const responseData = await response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
});
const start = async () => {
    try {
        server.listen({ port: 8080, host: "localhost" }, (err, address) => {
            if (err)
                throw new Error("server.listen");
            console.log(`Server listening at ${address}`);
        });
    }
    catch (e) {
        console.error({ error: e.message });
        process.exit(1);
    }
};
const shutdownServer = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    console.log('Server has been closed.');
    process.exit(0);
};
process.on('SIGINT', shutdownServer);
process.on('SIGTERM', shutdownServer);
start();
