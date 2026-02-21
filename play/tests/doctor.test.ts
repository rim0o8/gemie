import { describe, expect, it, vi } from 'vitest';
import { runDoctor } from '../src/doctor';

class FakeIO {
  public readonly out: string[] = [];
  public readonly err: string[] = [];

  print(message: string): void {
    this.out.push(message);
  }

  printError(message: string): void {
    this.err.push(message);
  }
}

describe('runDoctor', () => {
  it('モデル一覧取得成功時にOKを返す', async () => {
    const io = new FakeIO();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          models: [{ name: 'models/gemini-live-2.5-flash-preview' }],
        }),
        { status: 200 },
      ),
    );

    const ok = await runDoctor(
      { apiKey: 'AIza-test', model: 'gemini-live-2.5-flash-preview' },
      io,
      {
        fetcher,
        probeLiveSocket: vi.fn(async () => ({ ok: true, detail: 'open' })),
      },
    );

    expect(ok).toBe(true);
    expect(io.out.some((line) => line.includes('OK'))).toBe(true);
  });

  it('HTTPエラー時に詳細を表示してNGを返す', async () => {
    const io = new FakeIO();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: { code: 403, message: 'API key not valid', status: 'PERMISSION_DENIED' } }),
        { status: 403 },
      ),
    );

    const ok = await runDoctor(
      { apiKey: 'AIza-test', model: 'gemini-live-2.5-flash-preview' },
      io,
      { fetcher },
    );

    expect(ok).toBe(false);
    expect(io.err.some((line) => line.includes('PERMISSION_DENIED'))).toBe(true);
  });

  it('ネットワーク例外時にNGを返す', async () => {
    const io = new FakeIO();
    const fetcher = vi.fn(async () => {
      throw new Error('network down');
    });

    const ok = await runDoctor(
      { apiKey: 'AIza-test', model: 'gemini-live-2.5-flash-preview' },
      io,
      { fetcher },
    );

    expect(ok).toBe(false);
    expect(io.err.some((line) => line.includes('network down'))).toBe(true);
  });

  it('モデル未提供時にNGを返す', async () => {
    const io = new FakeIO();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          models: [{ name: 'models/gemini-1.5-flash' }],
        }),
        { status: 200 },
      ),
    );

    const ok = await runDoctor(
      { apiKey: 'AIza-test', model: 'gemini-live-2.5-flash-preview' },
      io,
      { fetcher },
    );

    expect(ok).toBe(false);
    expect(io.err.some((line) => line.includes('target model not found'))).toBe(true);
  });

  it('エラーレスポンスがJSONでない時もNGを返す', async () => {
    const io = new FakeIO();
    const fetcher = vi.fn(async () => new Response('oops', { status: 500 }));

    const ok = await runDoctor(
      { apiKey: 'AIza-test', model: 'gemini-live-2.5-flash-preview' },
      io,
      { fetcher },
    );

    expect(ok).toBe(false);
    expect(io.err.some((line) => line.includes('UNKNOWN_STATUS'))).toBe(true);
  });

  it('非Error例外でもNGを返す', async () => {
    const io = new FakeIO();
    const fetcher = vi.fn(async () => {
      throw 'failure';
    });

    const ok = await runDoctor(
      { apiKey: 'AIza-test', model: 'gemini-live-2.5-flash-preview' },
      io,
      { fetcher },
    );

    expect(ok).toBe(false);
    expect(io.err.some((line) => line.includes('unknown error'))).toBe(true);
  });

  it('WebSocket疎通NG時に理由を表示してNGを返す', async () => {
    const io = new FakeIO();
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          models: [{ name: 'models/gemini-live-2.5-flash-preview' }],
        }),
        { status: 200 },
      ),
    );
    const probeLiveSocket = vi.fn(async () => ({ ok: false, detail: 'close code=1006' }));

    const ok = await runDoctor(
      { apiKey: 'AIza-test', model: 'gemini-live-2.5-flash-preview' },
      io,
      { fetcher, probeLiveSocket },
    );

    expect(ok).toBe(false);
    expect(io.err.some((line) => line.includes('websocket failed'))).toBe(true);
    expect(io.err.some((line) => line.includes('1006'))).toBe(true);
  });
});
