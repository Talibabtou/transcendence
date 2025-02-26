import { z } from 'zod';
export const envSchema = z.object({
    DATABASE: z.string(),
    HOST: z.string(),
    CERTIF: z.string(),
    KEY: z.string(),
    AUTH: z.string(),
    GAME: z.string(),
    PORT: z.coerce.number()
        .min(1000, "Port should be more than 1000")
        .max(9000, "Port should be less than 9000")
});
export const authSchema = z.object({
    username: z.string().min(1, "can't be empty"),
    password: z.string().min(7, "minimum 7 characters"),
    email: z.string().email("should be a valid email adress")
});
