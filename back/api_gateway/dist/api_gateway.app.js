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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify = __importStar(require("fastify"));
const dotenv = __importStar(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const api_gateway_schema_1 = require("./modules/api_gateway.schema");
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const env = api_gateway_schema_1.envSchema.parse(process.env);
const server = fastify.fastify({
    logger: true,
    http2: true,
    https: {
        key: fs.readFileSync(env.KEY),
        cert: fs.readFileSync(env.CERTIF)
    }
});
server.get('/', (request, reply) => {
    const isHttps = request.protocol === 'https';
    return reply.code(200).send({
        hello: "world",
        isHttps: isHttps
    });
});
server.post('/auth/*', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHttps = request.protocol === 'https';
        const parsedRequest = api_gateway_schema_1.authSchema.parse(request.query);
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `${env.AUTH}${subpath}`;
        const response = yield (0, node_fetch_1.default)(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedRequest)
        });
        const responseData = yield response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
}));
server.get('/auth/*', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `${env.AUTH}${subpath}`;
        const response = yield (0, node_fetch_1.default)(serviceUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            body: request.body
        });
        const responseData = yield response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
}));
server.delete('/auth/*', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/auth')[1];
        const serviceUrl = `${env.AUTH}${subpath}`;
        const response = yield (0, node_fetch_1.default)(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.query
        });
        const responseData = yield response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
}));
server.post('/game/*', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `${env.GAME}${subpath}`;
        const response = yield (0, node_fetch_1.default)(serviceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.query
        });
        const responseData = yield response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
}));
server.get('/game/*', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `${env.GAME}${subpath}`;
        const response = yield (0, node_fetch_1.default)(serviceUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.body
        });
        const responseData = yield response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
}));
server.delete('/game/*', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isHttps = request.protocol === 'https';
        const subpath = request.url.split('/game')[1];
        const serviceUrl = `${env.GAME}${subpath}`;
        const response = yield (0, node_fetch_1.default)(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.query
        });
        const responseData = yield response.json();
        reply.send([{ from_service: responseData }, {
                from_client: {
                    hello: "world",
                    isHttps: isHttps
                }
            }
        ]);
    }
    catch (e) {
        reply.code(400).send({ e: e instanceof Error ? e.message : 'Unknown error' });
    }
}));
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
