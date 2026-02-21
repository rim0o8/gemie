import { z } from 'zod';
import { requestSchema } from './request';
import { judgeSchema } from './judge';
import { memoryItemSchema } from './memoryItem';
import { conversationSchema } from './conversation';

const historyItemSchema = z.object({
  requestId: z.string(),
  passed: z.boolean(),
  confidence: z.number(),
  reason: z.string(),
  timestamp: z.string(),
});

export const stateSchema = z.object({
  phase: z.enum([
    'menu',
    'listening',
    'requesting',
    'waiting_capture',
    'validating',
    'reaction',
    'error',
  ]),
  currentRequest: requestSchema.nullable(),
  lastJudge: judgeSchema.nullable(),
  lastIllustrationUrl: z.string().nullable(),
  requestHistory: z.array(historyItemSchema),
  memories: z.array(memoryItemSchema).default([]),
  collectedGemies: z
    .array(
      z.object({
        id: z.string(),
        imageUrl: z.string(),
        emotionTag: z.string(),
        requestPrompt: z.string(),
        createdAt: z.string(),
      }),
    )
    .default([]),
  conversation: conversationSchema.default({
    isLiveConnected: false,
    isListening: false,
    isSpeaking: false,
    lastTranscript: null,
    lastError: null,
  }),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number(),
      timestamp: z.string(),
      address: z.string().nullable().default(null),
    })
    .nullable()
    .default(null),
  updatedAt: z.string(),
});
