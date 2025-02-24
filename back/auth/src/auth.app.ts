import * as fastify from 'fastify';
import { z } from 'zod';
import * as fs from 'fs';
import { send } from 'process';

const server: fastify.FastifyInstance = fastify.fastify({ logger: true });

const start = async () => {
	try {
		server.listen({ port: 8081, host: "0.0.0.0" }, (err, address) => {
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

server.get('/', (request, reply) => {
    reply.code(200).send({ hello: "world" });
})

server.post('/', (request, reply) => {
    console.log(request.query);
    reply.code(200).send({ message: "Data save in db" });
})

process.on('SIGINT', shutdownServer);
process.on('SIGTERM', shutdownServer);
start();