import { z } from 'zod';

export const conversationSchema = z.object({
  isLiveConnected: z.boolean(),
  isListening: z.boolean(),
  isSpeaking: z.boolean(),
  lastTranscript: z.string().nullable(),
  lastError: z.string().nullable(),
});
