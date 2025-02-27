import { z } from 'zod';

export const regSchema = z.object({
    username: z.string().min(1, "can't be empty"),
    password: z.string().min(7, "minimum 7 characters"),
    email: z.string().email("should be a valid email adress")
});

export type RegSchemaType = z.infer<typeof regSchema>;

export const loginSchema = z.object({
    email: z.string().email("should be a valid email adress"),
    password: z.string().min(7, "minimum 7 characters")
});

export type LoginSchemaType = z.infer<typeof loginSchema>;