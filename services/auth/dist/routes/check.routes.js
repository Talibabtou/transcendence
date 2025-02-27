async function checkRoutes(fastify) {
    fastify.get('/check', (request, reply) => {
        const isHttps = request.protocol === 'https';
        return reply.code(200).send({
            hello: "world",
            method: request.method,
            isHttps: isHttps,
            check: 'database status'
        });
    });
}
export default checkRoutes;
