import { z } from 'zod';

export const reactionSchema = z.object({
  voiceText: z.string().min(1),
  illustrationPrompt: z.string().min(1),
  emotionTag: z.string().min(1),
});
