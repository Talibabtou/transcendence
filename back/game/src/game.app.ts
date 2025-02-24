import * as fastify from 'fastify';
import * as dotenv from 'dotenv';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { send } from 'process';
import { envSchema, Env} from './modules/game.schema';

dotenv.config({path: path.resolve(__dirname, '../.env')});

const env: Env = envSchema.parse(process.env);

const server: fastify.FastifyInstance = fastify.fastify({ logger: true });

server.get('/', (request, reply) => {
	const isHttps = request.protocol === 'https';

    return reply.code(200).send({
		hello: "world",
		method: request.method,
		isHttps: isHttps,
		message: "/ route"
	});
})

server.get('/test1', (request, reply) => {
	const isHttps = request.protocol === 'https';

    return reply.code(200).send({
		hello: "world",
		method: request.method,
		isHttps: isHttps,
		message: "/test1 route"
	});
})

server.get('/vroum', (request, reply) => {
	const isHttps = request.protocol === 'https';

    return reply.code(200).send({
		hello: "world",
		method: request.method,
		isHttps: isHttps,
		message: "/vroum route"
	});
})

server.post('/*', (request, reply) => {
	const isHttps = request.protocol === 'https';

    return reply.code(200).send({
		hello: "world",
		method: request.method,
		isHttps: isHttps
	});
})

server.delete('/*', (request, reply) => {
	const isHttps = request.protocol === 'https';

    return reply.code(200).send({
		hello: "world",
		method: request.method,
		isHttps: isHttps
	});
})

const start = async () => {
	try {
		server.listen({ port: env.PORT, host: env.HOST }, (err, address) => {
			if (err)
				throw new Error("server.listen");
			console.log(`Server listening at ${address}`);
		})
	} catch (e: any) {
		console.error({error: e.message});
		process.exit(1);
	}
}

const shutdownServer = async (signal: any) => {
	console.log(`\nReceived ${signal}. Shutting down gracefully...`);
	console.log('Server has been closed.');
	process.exit(0);
};

process.on('SIGINT', shutdownServer);
process.on('SIGTERM', shutdownServer);
start();