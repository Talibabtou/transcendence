"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authSchema = exports.envSchema = void 0;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    DATABASE: zod_1.z.string(),
    HOST: zod_1.z.string(),
    CERTIF: zod_1.z.string(),
    KEY: zod_1.z.string(),
    AUTH: zod_1.z.string(),
    PORT: zod_1.z.coerce.number()
        .min(1000, "Port should be more than 1000")
        .max(9000, "Port should be less than 9000")
});
exports.authSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "can't be empty"),
    password: zod_1.z.string().min(7, "minimum 7 characters"),
    email: zod_1.z.string().email("should be a valid email adress")
});
