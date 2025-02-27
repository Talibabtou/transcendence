async function checkRoutes(fastify) {
    fastify.addContentTypeParser('application/json', { parseAs: 'string' }, fastify.getDefaultJsonParser('ignore', 'ignore'));
    fastify.get('/check', (request, reply) => {
        console.log("In GET route /check");
        const isHttps = request.protocol === 'https';
        return reply.code(200).send({
            hello: "world",
            isHttps: isHttps
        });
    });
}
export default checkRoutes;
