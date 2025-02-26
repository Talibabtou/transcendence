import { z } from 'zod';
export const authSchema = z.object({
    username: z.string().min(1, "can't be empty"),
    password: z.string().min(7, "minimum 7 characters"),
    email: z.string().email("should be a valid email adress")
});
