import { z } from 'zod';

const runtimeEnvSchema = z.object({
  VITE_GOOGLE_API_KEY: z.string().trim().min(1, 'VITE_GOOGLE_API_KEY is required'),
  VITE_GEMINI_LIVE_MODEL: z.string().trim().min(1).optional(),
  VITE_GEMINI_TEXT_MODEL: z.string().trim().min(1).optional(),
  VITE_GEMINI_IMAGE_MODEL: z.string().trim().min(1).optional(),
  VITE_API_BASE_URL: z.string().trim().min(1).optional(),
  VITE_NANO_BANANA_ENDPOINT: z.string().trim().url().optional(),
  VITE_NANO_BANANA_API_KEY: z.string().trim().min(1).optional(),
});

export type RuntimeConfig = {
  readonly apiKey: string;
  readonly liveModel: string;
  readonly textModel: string;
  readonly imageModel: string;
  readonly apiBaseUrl: string;
  readonly nanoBananaEndpoint: string | null;
  readonly nanoBananaApiKey: string | null;
};

export const parseRuntimeConfig = (env: unknown): RuntimeConfig => {
  const parsed = runtimeEnvSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid runtime environment variables: ${details}`);
  }

  return {
    apiKey: parsed.data.VITE_GOOGLE_API_KEY,
    liveModel:
      parsed.data.VITE_GEMINI_LIVE_MODEL ?? 'gemini-2.5-flash-native-audio-preview-12-2025',
    textModel: parsed.data.VITE_GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash',
    imageModel: parsed.data.VITE_GEMINI_IMAGE_MODEL ?? 'gemini-3-pro-image-preview',
    apiBaseUrl: parsed.data.VITE_API_BASE_URL ?? '/api',
    nanoBananaEndpoint: parsed.data.VITE_NANO_BANANA_ENDPOINT ?? null,
    nanoBananaApiKey: parsed.data.VITE_NANO_BANANA_API_KEY ?? null,
  };
};
