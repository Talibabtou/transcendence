import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

async function checkRoutes(fastify: FastifyInstance) {
    fastify.get('/check', (request: any, reply: any) => {
        const isHttps = request.protocol === 'https';

        return reply.code(200).send({
            hello: "world",
            method: request.method,
            isHttps: isHttps,
            check: 'database status'
        });
    })
}

export default checkRoutes;