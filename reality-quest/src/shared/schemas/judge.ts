import { z } from 'zod';
import type { JudgeResult } from '../../types';

const parseBooleanLike = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  throw new Error('passed must be boolean');
};

const parseConfidenceLike = (value: unknown): number => {
  const raw = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(raw)) {
    throw new Error('confidence must be number');
  }
  if (raw >= 0 && raw <= 1) return raw;
  if (raw > 1 && raw <= 100) return raw / 100;
  throw new Error('confidence out of range');
};

const parseMatchedObjectsLike = (value: unknown): readonly string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
};

const parseSafetyLike = (value: unknown): JudgeResult['safety'] => {
  if (value === 'safe' || value === 'unsafe' || value === 'unknown') return value;
  return 'unknown';
};

export const judgeResultSchema = z.object({
  passed: z.unknown().transform((value, ctx) => {
    try {
      return parseBooleanLike(value);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'passed: boolean が必要です' });
      return z.NEVER;
    }
  }),
  reason: z.string().min(1),
  confidence: z.unknown().transform((value, ctx) => {
    try {
      return parseConfidenceLike(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'confidence: 0-1 または 0-100 が必要です',
      });
      return z.NEVER;
    }
  }),
  matchedObjects: z
    .unknown()
    .optional()
    .transform((value) => parseMatchedObjectsLike(value)),
  safety: z
    .unknown()
    .optional()
    .transform((value) => parseSafetyLike(value)),
});

/** stateStore 用: 保存済み JudgeResult のバリデーション (strict) */
export const judgeSchema = z.object({
  passed: z.boolean(),
  reason: z.string(),
  confidence: z.number(),
  matchedObjects: z.array(z.string()),
  safety: z.enum(['safe', 'unsafe', 'unknown']),
});
