import { describe, expect, it, vi } from 'vitest';
import { runLiveTextApp } from '../src/liveTextApp';
import type { LiveConnect, LiveSession, UserIO } from '../src/types';

class FakeIO implements UserIO {
  private lineHandler: ((line: string) => void | Promise<void>) | null = null;
  public readonly output: string[] = [];
  public readonly errors: string[] = [];

  onLine(handler: (line: string) => void | Promise<void>): void {
    this.lineHandler = handler;
  }

  print(message: string): void {
    this.output.push(message);
  }

  printError(message: string): void {
    this.errors.push(message);
  }

  close(): void {
    this.output.push('__closed__');
  }

  async emit(line: string): Promise<void> {
    if (!this.lineHandler) {
      throw new Error('line handler is not set');
    }
    await this.lineHandler(line);
  }
}

describe('runLiveTextApp', () => {
  it('入力を Live API へ送信する', async () => {
    const io = new FakeIO();
    const sendClientContent = vi.fn(async () => undefined);
    const close = vi.fn(() => undefined);

    const session: LiveSession = {
      sendClientContent,
      close,
    };

    const connect: LiveConnect = vi.fn(async ({ callbacks }) => {
      callbacks.onmessage({
        serverContent: {
          modelTurn: {
            parts: [{ text: 'hello from model' }],
          },
        },
      });
      return session;
    });

    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );

    await io.emit('こんにちは');
    await io.emit('/exit');
    await run;

    expect(sendClientContent).toHaveBeenCalledWith({
      turns: [{ role: 'user', parts: [{ text: 'こんにちは' }] }],
      turnComplete: true,
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(io.output.some((line) => line.includes('hello from model'))).toBe(true);
  });

  it('空入力は送信せずエラー表示する', async () => {
    const io = new FakeIO();
    const sendClientContent = vi.fn(async () => undefined);

    const session: LiveSession = {
      sendClientContent,
      close: vi.fn(() => undefined),
    };

    const connect: LiveConnect = vi.fn(async () => session);
    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );

    await io.emit('');
    await io.emit('/exit');
    await run;

    expect(sendClientContent).not.toHaveBeenCalled();
    expect(io.errors.some((line) => line.includes('入力'))).toBe(true);
  });

  it('送信時エラーを表示する', async () => {
    const io = new FakeIO();
    const session: LiveSession = {
      sendClientContent: vi.fn(async () => {
        throw new Error('send broken');
      }),
      close: vi.fn(() => undefined),
    };
    const connect: LiveConnect = vi.fn(async () => session);

    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );
    await io.emit('hello');
    await io.emit('/exit');
    await run;

    expect(io.errors.some((line) => line.includes('send failed'))).toBe(true);
  });

  it('オブジェクト形式エラーの詳細を表示する', async () => {
    const io = new FakeIO();
    const connect: LiveConnect = vi.fn(async ({ callbacks }) => {
      callbacks.onerror?.({ message: 'forbidden', status: 403, code: 'PERMISSION_DENIED' });
      return {
        sendClientContent: vi.fn(() => undefined),
        close: vi.fn(() => undefined),
      };
    });

    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );
    await io.emit('/exit');
    await run;

    expect(io.errors.some((line) => line.includes('PERMISSION_DENIED'))).toBe(true);
    expect(io.errors.some((line) => line.includes('403'))).toBe(true);
  });

  it('接続失敗時に終了する', async () => {
    const io = new FakeIO();
    const connect: LiveConnect = vi.fn(async () => {
      throw new Error('connect broken');
    });

    await runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );

    expect(io.output).toContain('__closed__');
    expect(io.errors.some((line) => line.includes('connect failed'))).toBe(true);
  });

  it('空のモデル応答は表示しない', async () => {
    const io = new FakeIO();
    const connect: LiveConnect = vi.fn(async ({ callbacks }) => {
      callbacks.onmessage({ text: '   ' });
      callbacks.onmessage({ serverContent: { modelTurn: { parts: [{ text: '' }] } } });
      return {
        sendClientContent: vi.fn(() => undefined),
        close: vi.fn(() => undefined),
      };
    });

    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );
    await io.emit('/exit');
    await run;

    expect(io.output.filter((line) => line.startsWith('AI>')).length).toBe(0);
  });

  it('終了処理で close 失敗時にエラー表示する', async () => {
    const io = new FakeIO();
    const connect: LiveConnect = vi.fn(async () => ({
      sendClientContent: vi.fn(() => undefined),
      close: () => {
        throw 'close exploded';
      },
    }));

    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );
    await io.emit('/exit');
    await run;

    expect(io.errors.some((line) => line.includes('close failed: close exploded'))).toBe(true);
  });

  it('終了後に接続失敗が来ても二重終了しない', async () => {
    const io = new FakeIO();
    const state: { rejectLater: null | (() => void) } = { rejectLater: null };
    const connectPromise = new Promise<LiveSession>((_, reject) => {
      state.rejectLater = () => {
        reject(new Error('late connect error'));
      };
    });
    const connect: LiveConnect = vi.fn(async () => await connectPromise);

    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );
    const exitPromise = io.emit('/exit');
    state.rejectLater?.();
    await exitPromise;
    await run;

    const closeEvents = io.output.filter((line) => line === '__closed__').length;
    expect(closeEvents).toBe(1);
  });

  it('onclose の情報を表示する', async () => {
    const io = new FakeIO();
    const connect: LiveConnect = vi.fn(async ({ callbacks }) => {
      callbacks.onclose?.({ code: 1008, reason: 'policy violation', wasClean: false });
      return {
        sendClientContent: vi.fn(() => undefined),
        close: vi.fn(() => undefined),
      };
    });

    const run = runLiveTextApp(
      { apiKey: 'test', model: 'gemini-live-2.5-flash-preview' },
      { connect, io },
    );
    await io.emit('/exit');
    await run;

    expect(io.errors.some((line) => line.includes('close event'))).toBe(true);
    expect(io.errors.some((line) => line.includes('1008'))).toBe(true);
  });
});
