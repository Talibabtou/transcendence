import * as fastify from 'fastify';
import * as dotenv from 'dotenv';
import fetch  from 'node-fetch';
import * as path from 'path';
import { z } from 'zod';
import * as fs from 'fs';
import * as https from 'https';
import { Http2SecureServer, Http2ServerRequest, Http2ServerResponse } from 'http2';
import { envSchema, Env, authSchema, Auth } from './modules/api_gateway.schema';

dotenv.config({path: path.resolve(__dirname, '../.env')});

const env: Env = envSchema.parse(process.env);

const server: fastify.FastifyInstance<Http2SecureServer, Http2ServerRequest, Http2ServerResponse>
	= fastify.fastify({
		logger: true,
		http2: true,
		https: {
				key: fs.readFileSync(env.KEY),
				cert: fs.readFileSync(env.CERTIF)
			}
	});

server.get('/', (request, reply) => { return {hello: "world"} })

server.post('/auth', async (request, reply) => { 
	try {
		const parsedRequest = authSchema.parse(request.query);
		console.log("request has been send to the corresponding service");
		const response = await fetch(env.AUTH, {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json',
			},
			body: JSON.stringify(parsedRequest)
		});

		
		console.log("waiting for an answer...");
		const responseData = await response.json();
		console.log("received");
		reply.send(responseData);
	} catch (error: any) {
		reply.code(400).send({ error: error.message })
	}
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