import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BodyInit } from 'node-fetch';

async function authRoutes(fastify: FastifyInstance) {
	// Get specific user
	fastify.get('/auth/:id', async (request: FastifyRequest, reply: FastifyReply) => { 
		try {
			const subpath = request.url.split('/v1')[1];
			console.log({ subpath: subpath });
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				  },
				body: JSON.stringify(request.body)
			});
			const responseData: any = await response.json();
			if (!responseData)
				throw new Error(`Response error with route ${subpath}`)
			return reply.code(200).send(responseData);
		  } catch (err: any) {
				console.error(err.message);
				return reply.code(500).send({
			  message: 'Internal server error',
			  error: err.message
			});
		}
	 })
	// Get all users
	fastify.get('/auth', async (request: FastifyRequest, reply: FastifyReply) => { 
		try {
			const subpath = request.url.split('/v1')[1];
			console.log({ subpath: subpath });
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				  },
				body: JSON.stringify(request.body)
			});
			const responseData: any = await response.json();
			if (!responseData)
				throw new Error(`Response error with route ${subpath}`)
			return reply.code(200).send(responseData);
		  } catch (err: any) {
				console.error(err.message);
				return reply.code(500).send({
			  message: 'Internal server error',
			  error: err.message
			});
		}
	 })
	// Create a user
	fastify.post('/auth', async (request: FastifyRequest, reply: FastifyReply) => { 
		try {
			const subpath = request.url.split('/v1')[1];
			console.log({ subpath: subpath });
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				  },
				body: JSON.stringify(request.body)
			});
			const responseData: any = await response.json();
			if (!responseData)
				throw new Error(`Response error with route ${subpath}`)
			return reply.code(201).send(responseData);
		  } catch (err: any) {
				console.error(err.message);
				return reply.code(500).send({
			  message: 'Internal server error',
			  error: err.message
			});
		}
	 })
	// Modify a user
	fastify.put('/auth/:id', async (request: FastifyRequest, reply: FastifyReply) => { 
		try {
			const subpath = request.url.split('/v1')[1];
			console.log({ subpath: subpath });
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				  },
				body: JSON.stringify(request.body)
			});
			const responseData: any = await response.json();
			if (!responseData)
				throw new Error(`Response error with route ${subpath}`)
			return reply.code(200).send(responseData);
		  } catch (err: any) {
				console.error(err.message);
				return reply.code(500).send({
			  message: 'Internal server error',
			  error: err.message
			});
		}
	 })
	// Delete a user
	fastify.delete('/auth/:id', async (request: FastifyRequest, reply: FastifyReply) => { 
		try {
			const subpath = request.url.split('/v1')[1];
			console.log({ subpath: subpath });
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				  },
				body: JSON.stringify(request.body)
			});
			const responseData: any = await response.json();
			if (!responseData)
				throw new Error(`Response error with route ${subpath}`)
			return reply.code(200).send(responseData);
		  } catch (err: any) {
				console.error(err.message);
				return reply.code(500).send({
			  message: 'Internal server error',
			  error: err.message
			});
		}
	 })
	// Login
	fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => { 
		try {
			const subpath = request.url.split('/v1')[1];
			console.log({ subpath: subpath });
			const serviceUrl = `http://localhost:8082${subpath}`;
			const response = await fetch(serviceUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				  },
				body: JSON.stringify(request.body)
			});
			const responseData = await response.json();
			if (!responseData)
				throw new Error(`Response error with route ${subpath}`)
			return reply.code(200).send(responseData);
		  } catch (err: any) {
				console.error(err.message);
				return reply.code(500).send({
			  message: 'Internal server error',
			  error: err.message
			});
		}
	 })
}

export default authRoutes;