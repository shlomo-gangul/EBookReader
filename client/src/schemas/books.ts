import { z } from 'zod';

const GutenbergBookSchema = z.object({
  id: z.number(),
  title: z.string(),
  authors: z.array(z.object({ name: z.string() })),
  subjects: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  formats: z.record(z.string(), z.string()).optional(),
  download_count: z.number().optional(),
});

export const GutenbergResponseSchema = z.object({
  count: z.number(),
  results: z.array(GutenbergBookSchema),
});

export type GutenbergResponse = z.infer<typeof GutenbergResponseSchema>;
