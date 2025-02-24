import * as fastify from 'fastify';
import * as dotenv from 'dotenv';
import fetch  from 'node-fetch';
import * as path from 'path';
import { z } from 'zod';
import * as fs from 'fs';
import * as https from 'https';
import { Http2SecureServer, Http2ServerRequest, Http2ServerResponse } from 'http2';
import { envSchema, Env, authSchema, Auth } from './modules/api_gateway.schema';
import { send } from 'process';

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

server.get('/', (request: any, reply: any) => { 
	const isHttps = request.protocol === 'https';
	return reply.code(200).send({ 
		hello: "world",
		isHttps: isHttps
	});
})

server.post('/auth/*', async (request: any, reply: any) => { 
	try {
		const isHttps = request.protocol === 'https';
		const parsedRequest = authSchema.parse(request.query);
		const subpath = request.url.split('/auth')[1];
		const serviceUrl = `${env.AUTH}${subpath}`;
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
		])
	} catch (e: any) {
		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
	}
})

server.get('/auth/*', async (request: any, reply: any) => { 
	try {
		const isHttps = request.protocol === 'https';
		const subpath = request.url.split('/auth')[1];
		const serviceUrl = `${env.AUTH}${subpath}`;
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
		])
	} catch (e: any) {
		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
	}
})

server.delete('/auth/*', async (request: any, reply: any) => { 
	try {
		const isHttps = request.protocol === 'https';
		const subpath = request.url.split('/auth')[1];
		const serviceUrl = `${env.AUTH}${subpath}`;
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
		])
	} catch (e: any) {
		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
	}
})

server.post('/game/*', async (request: any, reply: any) => { 
	try {
		const isHttps = request.protocol === 'https';
		const subpath = request.url.split('/game')[1];
		const serviceUrl = `${env.GAME}${subpath}`;
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
		])
	} catch (e: any) {
		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
	}
})

server.get('/game/*', async (request: any, reply: any) => { 
	try {
		const isHttps = request.protocol === 'https';
		const subpath = request.url.split('/game')[1];
		const serviceUrl = `${env.GAME}${subpath}`;
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
		])
	} catch (e: any) {
		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
	}
})

server.delete('/game/*', async (request: any, reply: any) => { 
	try {
		const isHttps = request.protocol === 'https';
		const subpath = request.url.split('/game')[1];
		const serviceUrl = `${env.GAME}${subpath}`;
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
		])
	} catch (e: any) {
		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
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