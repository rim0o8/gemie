import { z } from 'zod';

export const memoryItemSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().url(),
  summary: z.string().min(1),
  createdAt: z.string().min(1),
  sourceRequestId: z.string().min(1),
  emotionTag: z.string().nullable(),
});
