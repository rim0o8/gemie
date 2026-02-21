import { z } from 'zod';

export const requestSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['food', 'scenery', 'object', 'spot']),
  prompt: z.string().min(1),
  acceptanceCriteria: z.string().min(1),
  hintPrompt: z.string().min(1),
});
