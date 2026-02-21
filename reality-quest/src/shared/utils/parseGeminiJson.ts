import type { ZodType } from 'zod';
import { normalizeJsonString } from './normalizeJson';

/**
 * Gemini LLM の応答テキストから JSON をパースし、Zod スキーマでバリデーションする。
 * markdown code block で囲まれている場合も対応する。
 */
export const parseGeminiJson = <T>(text: string, schema: ZodType<T>, label: string): T => {
  const parsed = schema.safeParse(JSON.parse(normalizeJsonString(text)));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid ${label}: ${details}`);
  }
  return parsed.data;
};
