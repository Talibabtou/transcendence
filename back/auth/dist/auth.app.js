"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify = __importStar(require("fastify"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const auth_schema_1 = require("./modules/auth.schema");
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const env = auth_schema_1.envSchema.parse(process.env);
const server = fastify.fastify({ logger: true });
server.get('/', (request, reply) => {
    const isHttps = request.protocol === 'https';
    return reply.code(200).send({
        hello: "world",
        method: request.method,
        isHttps: isHttps,
        message: "/ route"
    });
});
server.get('/test1', (request, reply) => {
    const isHttps = request.protocol === 'https';
    return reply.code(200).send({
        hello: "world",
        method: request.method,
        isHttps: isHttps,
        message: "/test1 route"
    });
});
server.get('/caravane', (request, reply) => {
    const isHttps = request.protocol === 'https';
    return reply.code(200).send({
        hello: "world",
        method: request.method,
        isHttps: isHttps,
        message: "/caravane route"
    });
});
server.post('/*', (request, reply) => {
    const isHttps = request.protocol === 'https';
    return reply.code(200).send({
        hello: "world",
        method: request.method,
        isHttps: isHttps
    });
});
server.delete('/*', (request, reply) => {
    const isHttps = request.protocol === 'https';
    return reply.code(200).send({
        hello: "world",
        method: request.method,
        isHttps: isHttps
    });
});
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        server.listen({ port: env.PORT, host: env.HOST }, (err, address) => {
            if (err)
                throw new Error("server.listen");
            console.log(`Server listening at ${address}`);
        });
    }
    catch (e) {
        console.error({ error: e.message });
        process.exit(1);
    }
});
const shutdownServer = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    console.log('Server has been closed.');
    process.exit(0);
});
process.on('SIGINT', shutdownServer);
process.on('SIGTERM', shutdownServer);
start();
