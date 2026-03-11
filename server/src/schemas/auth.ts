import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const RegisterSchema = LoginSchema.extend({
  name: z.string().optional(),
});

export const SyncSchema = z.object({
  bookId: z.string(),
  currentPage: z.number(),
  totalPages: z.number(),
});
