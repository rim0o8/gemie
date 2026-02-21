import { z } from 'zod';
import { memoryItemSchema, saveMemoryInputSchema } from '../../shared/schemas';
import type { SaveMemoryInput } from '../../shared/schemas';
import type { MemoryItem } from '../../types';

const memoriesResponseSchema = z.object({
  items: z.array(memoryItemSchema),
});

const randomMemoryResponseSchema = z.object({
  item: memoryItemSchema.nullable(),
});

const saveMemoryResponseSchema = z.object({
  item: memoryItemSchema,
});

export type { SaveMemoryInput };
export type ApiClientFetch = typeof fetch;

export type MemoryApiClient = {
  readonly listMemories: () => Promise<readonly MemoryItem[]>;
  readonly getRandomMemory: () => Promise<MemoryItem | null>;
  readonly saveMemory: (input: SaveMemoryInput) => Promise<MemoryItem>;
};

type CreateMemoryApiClientInput = {
  readonly baseUrl: string;
  readonly fetchFn?: ApiClientFetch;
};

const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Memory API request failed: ${response.status} ${text}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`Memory API returned invalid JSON: ${String(error)}`);
  }
};

const API_TIMEOUT_MS = 5000;

export const createMemoryApiClient = ({
  baseUrl,
  fetchFn = fetch,
}: CreateMemoryApiClientInput): MemoryApiClient => {
  const endpoint = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return {
    listMemories: async (): Promise<readonly MemoryItem[]> => {
      const response = await fetchFn(`${endpoint}/memories`, {
        method: 'GET',
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      const raw = await parseJsonResponse(response);
      const parsed = memoriesResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`Invalid memories response: ${parsed.error.message}`);
      }
      return parsed.data.items;
    },
    getRandomMemory: async (): Promise<MemoryItem | null> => {
      const response = await fetchFn(`${endpoint}/memories/random`, {
        method: 'GET',
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      const raw = await parseJsonResponse(response);
      const parsed = randomMemoryResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`Invalid memory response: ${parsed.error.message}`);
      }
      return parsed.data.item;
    },
    saveMemory: async (input: SaveMemoryInput): Promise<MemoryItem> => {
      const request = saveMemoryInputSchema.parse(input);
      const response = await fetchFn(`${endpoint}/memories`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      const raw = await parseJsonResponse(response);
      const parsed = saveMemoryResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`Invalid memory save response: ${parsed.error.message}`);
      }
      return parsed.data.item;
    },
  };
};
