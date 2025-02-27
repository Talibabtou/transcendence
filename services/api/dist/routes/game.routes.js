// server.post('/game/*', async (request: any, reply: any) => { 
// 	try {
// 		const isHttps = request.protocol === 'https';
// 		const subpath = request.url.split('/game')[1];
// 		const serviceUrl = `http://localhost:8083`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'POST',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: request.query
// 		});
// 		const responseData = await response.json();
// 		reply.send([{ from_service: responseData }, {
// 				from_client: { 
// 					hello: "world",
// 					isHttps: isHttps
// 				}
// 			}
// 		])
// 	} catch (e: any) {
// 		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
// 	}
// })
export {};
// server.get('/game/*', async (request: any, reply: any) => { 
// 	try {
// 		const isHttps = request.protocol === 'https';
// 		const subpath = request.url.split('/game')[1];
// 		const serviceUrl = `http://localhost:8083`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'GET',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: request.body
// 		});
// 		const responseData = await response.json();
// 		reply.send([{ from_service: responseData }, {
// 				from_client: { 
// 					hello: "world",
// 					isHttps: isHttps
// 				}
// 			}
// 		])
// 	} catch (e: any) {
// 		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
// 	}
// })
// server.delete('/game/*', async (request: any, reply: any) => { 
// 	try {
// 		const isHttps = request.protocol === 'https';
// 		const subpath = request.url.split('/game')[1];
// 		const serviceUrl = `http://localhost:8083`;
// 		const response = await fetch(serviceUrl, {
// 			method: 'DELETE',
// 			headers: {
// 			  'Content-Type': 'application/json',
// 			},
// 			body: request.query
// 		});
// 		const responseData = await response.json();
// 		reply.send([{ from_service: responseData }, {
// 				from_client: { 
// 					hello: "world",
// 					isHttps: isHttps
// 				}
// 			}
// 		])
// 	} catch (e: any) {
// 		reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
// 	}
// })
