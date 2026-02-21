import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryApiClient,
  type SaveMemoryInput,
  type ApiClientFetch,
} from './memoryApiClient';

const memoryItem = {
  id: 'mem-1',
  imageUrl: 'https://cdn.example.com/mem-1.jpg',
  summary: '赤いりんごをくれた思い出',
  createdAt: '2026-02-21T00:00:00.000Z',
  sourceRequestId: 'req-1',
  emotionTag: 'excited',
};

describe('memoryApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn<ApiClientFetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<ApiClientFetch>();
  });

  it('listMemories が配列を返す', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [memoryItem] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createMemoryApiClient({
      baseUrl: 'https://example.com/api',
      fetchFn: fetchMock,
    });
    const items = await client.listMemories();

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('mem-1');
  });

  it('getRandomMemory が null を返せる', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ item: null }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createMemoryApiClient({ baseUrl: '/api', fetchFn: fetchMock });
    const item = await client.getRandomMemory();
    expect(item).toBeNull();
  });

  it('saveMemory が保存済みメモリを返す', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ item: memoryItem }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const input: SaveMemoryInput = {
      imageBase64: 'aGVsbG8=',
      sourceRequestId: 'req-1',
      judgeReason: '一致',
      matchedObjects: ['apple'],
      capturedAt: '2026-02-21T00:00:00.000Z',
    };
    const client = createMemoryApiClient({ baseUrl: '/api', fetchFn: fetchMock });
    const item = await client.saveMemory(input);

    expect(item.summary).toContain('りんご');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('不正レスポンスなら例外を投げる', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ wrong: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const client = createMemoryApiClient({ baseUrl: '/api', fetchFn: fetchMock });
    await expect(client.listMemories()).rejects.toThrow('Invalid memories response');
  });

  it('HTTPエラーなら例外を投げる', async () => {
    fetchMock.mockResolvedValue(
      new Response('bad request', {
        status: 400,
      }),
    );

    const client = createMemoryApiClient({ baseUrl: '/api', fetchFn: fetchMock });
    await expect(client.getRandomMemory()).rejects.toThrow('Memory API request failed');
  });
});
