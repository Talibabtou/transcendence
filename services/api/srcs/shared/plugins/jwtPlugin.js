"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
module.exports = (0, fastify_plugin_1.default)(async function (fastify, opts, done) {
    fastify.register(jwt_1.default, {
        secret: "super_secret",
        sign: {
            expiresIn: '24h',
        },
    });
    fastify.decorate('generateToken', function (payload) {
        return fastify.jwt.sign(payload);
    });
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.routeOptions?.config?.auth !== false) {
            try {
                await request.jwtVerify();
            }
            catch (err) {
                reply.status(401).send({ message: 'Unauthorized' });
            }
        }
    });
});
