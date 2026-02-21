import { z } from 'zod';

const serverEnvSchema = z.object({
  GOOGLE_API_KEY: z.string().min(1),
  GEMINI_TEXT_MODEL: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  MEMORIES_TABLE: z.string().min(1).optional(),
  PORT: z.string().min(1).optional(),
});

export type ServerEnv = {
  readonly googleApiKey: string;
  readonly geminiTextModel: string;
  readonly databaseUrl: string;
  readonly memoriesTable: string;
  readonly port: number;
};

export const parseServerEnv = (rawEnv: unknown): ServerEnv => {
  const parsed = serverEnvSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join(', ');
    throw new Error(`Invalid server env: ${issues}`);
  }

  return {
    googleApiKey: parsed.data.GOOGLE_API_KEY,
    geminiTextModel: parsed.data.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash',
    databaseUrl: parsed.data.DATABASE_URL,
    memoriesTable: parsed.data.MEMORIES_TABLE ?? 'memories',
    port: Number(parsed.data.PORT ?? 8787),
  };
};
