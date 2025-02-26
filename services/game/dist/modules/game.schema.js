"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    HOST: zod_1.z.string(),
    PORT: zod_1.z.coerce.number()
        .min(1000, "Port should be more than 1000")
        .max(9000, "Port should be less than 9000")
});
