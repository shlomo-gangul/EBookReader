import { z } from 'zod';

export const CreateHighlightSchema = z.object({
  id: z.string(),
  bookId: z.string(),
  pageNumber: z.number(),
  startChar: z.number(),
  endChar: z.number(),
  color: z.string().default('#fef08a'),
  note: z.string().optional(),
  createdAt: z.string().optional(),
});

export const UpdateHighlightSchema = CreateHighlightSchema.partial().required({ color: true });
