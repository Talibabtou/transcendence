import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fetch  from 'node-fetch';

interface ServiceResponse {
	method?: string;
	isHttps?: string;
	message: Array<any>;
}

async function authRoutes(fastify: FastifyInstance) {
	fastify.addContentTypeParser('application/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'));

	fastify.post('/auth', async (request: any, reply: any) => { 
		try {
			const isHttps = request.protocol === 'https';
			const subpath = request.url.split('/api')[1];
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'POST',
				headers: {
				  'Content-Type': 'application/json',
				},
				body: JSON.stringify(request.query)
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

	fastify.get('/auth', async (request: any, reply: any) => { 
		try {
			const isHttps = request.protocol === 'https';
			const subpath = request.url.split('/api')[1];
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'GET',
				headers: {
				  'Content-Type': 'application/json',
				},
				body: JSON.stringify(request.body)
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

	fastify.delete('/auth', async (request: any, reply: any) => { 
		try {
			const isHttps = request.protocol === 'https';
			const subpath = request.url.split('/api')[1];
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'GET',
				headers: {
				  'Content-Type': 'application/json',
				},
				body: JSON.stringify(request.query)
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
}

export default authRoutes;