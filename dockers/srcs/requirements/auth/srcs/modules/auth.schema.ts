import { string, z } from 'zod';

export const envSchema = z.object({
    HOST: z.string(),
    PORT: z.coerce.number()
        .min(1000, "Port should be more than 1000")
        .max(9000, "Port should be less than 9000")
});

export type Env = z.infer<typeof envSchema>;