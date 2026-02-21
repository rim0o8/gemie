import { z } from 'zod';
import type { AppConfig } from './types';

const envSchema = z.object({
  GOOGLE_API_KEY: z.string().min(1, 'GOOGLE_API_KEY is required'),
  GEMINI_LIVE_MODEL: z.string().min(1).default('gemini-live-2.5-flash-preview'),
});

export const loadConfig = (env: Record<string, string | undefined>): AppConfig => {
  const parsed = envSchema.parse(env);
  return {
    apiKey: parsed.GOOGLE_API_KEY,
    model: parsed.GEMINI_LIVE_MODEL,
  };
};
