import { z } from 'zod';

export const saveMemoryInputSchema = z.object({
  imageBase64: z.string().min(8),
  sourceRequestId: z.string().min(1),
  judgeReason: z.string().min(1),
  matchedObjects: z.array(z.string()),
  capturedAt: z.string().min(1),
});

export type SaveMemoryInput = z.infer<typeof saveMemoryInputSchema>;
