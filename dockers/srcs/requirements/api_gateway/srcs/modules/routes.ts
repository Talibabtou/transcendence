// server.post('/auth/*', async (request, reply) => { 
// 	try {
// 		const parsedRequest = authSchema.parse(request.query);
// 		const subpath = request.url.split('/auth')[1];
// 		const serviceUrl = `${env.AUTH}/${subpath}`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'POST',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: JSON.stringify(parsedRequest)
// 		});
// 		const responseData = await response.json();
// 		reply.send(responseData);
// 	} catch (error: any) {
// 		reply.code(400).send({ error: error instanceof Error ? error.message : 'Unknown error' });
// 	}
// })

// server.get('/auth/*', async (request, reply) => { 
// 	try {
// 		const parsedRequest = authSchema.parse(request.query);
// 		const subpath = request.url.split('/auth')[1];
// 		const serviceUrl = `${env.AUTH}/${subpath}`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'GET',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: JSON.stringify(parsedRequest)
// 		});
// 		const responseData = await response.json();
// 		reply.send(responseData);
// 	} catch (error: any) {
// 		reply.code(400).send({ error: error instanceof Error ? error.message : 'Unknown error' });
// 	}
// })

// server.delete('/auth/*', async (request, reply) => { 
// 	try {
// 		const parsedRequest = authSchema.parse(request.query);
// 		const subpath = request.url.split('/auth')[1];
// 		const serviceUrl = `${env.AUTH}/${subpath}`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'DELETE',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: JSON.stringify(parsedRequest)
// 		});
// 		const responseData = await response.json();
// 		reply.send(responseData);
// 	} catch (error: any) {
// 		reply.code(400).send({ error: error instanceof Error ? error.message : 'Unknown error' });
// 	}
// })

// server.post('/game/*', async (request, reply) => { 
// 	try {
// 		const parsedRequest = authSchema.parse(request.query);
// 		const subpath = request.url.split('/auth')[1];
// 		const serviceUrl = `${env.AUTH}/${subpath}`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'POST',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: JSON.stringify(parsedRequest)
// 		});
// 		const responseData = await response.json();
// 		reply.send(responseData);
// 	} catch (error: any) {
// 		reply.code(400).send({ error: error instanceof Error ? error.message : 'Unknown error' });
// 	}
// })

// server.get('/game/*', async (request, reply) => { 
// 	try {
// 		const parsedRequest = authSchema.parse(request.query);
// 		const subpath = request.url.split('/auth')[1];
// 		const serviceUrl = `${env.AUTH}/${subpath}`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'GET',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: JSON.stringify(parsedRequest)
// 		});
// 		const responseData = await response.json();
// 		reply.send(responseData);
// 	} catch (error: any) {
// 		reply.code(400).send({ error: error instanceof Error ? error.message : 'Unknown error' });
// 	}
// })

// server.delete('/game/*', async (request, reply) => { 
// 	try {
// 		const parsedRequest = authSchema.parse(request.query);
// 		const subpath = request.url.split('/auth')[1];
// 		const serviceUrl = `${env.AUTH}/${subpath}`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'DELETE',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: JSON.stringify(parsedRequest)
// 		});
// 		const responseData = await response.json();
// 		reply.send(responseData);
// 	} catch (error: any) {
// 		reply.code(400).send({ error: error instanceof Error ? error.message : 'Unknown error' });
// 	}
// })