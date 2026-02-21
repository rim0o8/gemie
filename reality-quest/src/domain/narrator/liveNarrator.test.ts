import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const connectMock = vi.fn();

vi.mock('@google/genai', () => ({
  Modality: { AUDIO: 'AUDIO' },
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    live: {
      connect: connectMock,
    },
  })),
}));

type OnMessagePayload = {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{ inlineData?: { data?: string } }>;
    };
    turnComplete?: boolean;
  };
};

type ConnectCallbacks = {
  onmessage: (message: OnMessagePayload) => void;
  onerror: (event: unknown) => void;
  onclose: () => void;
};

class FakeAudioContext {
  public state: 'running' | 'suspended' | 'closed';
  public readonly destination = {} as AudioDestinationNode;
  public readonly resume = vi.fn(async () => {
    this.state = 'running';
  });
  public readonly close = vi.fn(async () => {
    this.state = 'closed';
  });
  public readonly createBuffer = vi.fn(() => ({
    copyToChannel: vi.fn(),
  }));
  public readonly createBufferSource = vi.fn(() => {
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      onended: null as (() => void) | null,
      start: vi.fn(function start(this: { onended: (() => void) | null }) {
        this.onended?.();
      }),
    };
    return source;
  });

  constructor(state: 'running' | 'suspended' = 'running') {
    this.state = state;
  }
}

const setupSpeechSynthesis = () => {
  const speak = vi.fn((utterance: { onend?: () => void }) => {
    utterance.onend?.();
  });
  const cancel = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, cancel });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      public readonly text: string;
      public lang = '';
      public rate = 1;
      public pitch = 1;
      public onend: (() => void) | null = null;
      public onerror: (() => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    },
  );
  return { speak, cancel };
};

describe('createLiveNarrator', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    connectMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Live API が無音レスポンスの時は speechSynthesis にフォールバックする', async () => {
    const audioContext = new FakeAudioContext('running');
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => audioContext),
    );
    const { speak } = setupSpeechSynthesis();

    connectMock.mockImplementation(async ({ callbacks }: { callbacks: ConnectCallbacks }) => {
      const session = {
        sendClientContent: vi.fn(() => {
          callbacks.onmessage({ serverContent: { turnComplete: true } });
        }),
        close: vi.fn(),
      };
      return session;
    });

    const { createLiveNarrator } = await import('./liveNarrator');
    const narrator = await createLiveNarrator('key', 'model');

    await narrator.speak('こんにちは');

    expect(speak).toHaveBeenCalledTimes(1);
    expect(audioContext.createBuffer).not.toHaveBeenCalled();
  });

  it('AudioContext が suspended なら再生前に resume する', async () => {
    const audioContext = new FakeAudioContext('suspended');
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => audioContext),
    );
    setupSpeechSynthesis();

    connectMock.mockImplementation(async ({ callbacks }: { callbacks: ConnectCallbacks }) => {
      const session = {
        sendClientContent: vi.fn(() => {
          callbacks.onmessage({
            serverContent: {
              modelTurn: {
                parts: [{ inlineData: { data: 'AAA=' } }],
              },
            },
          });
          callbacks.onmessage({ serverContent: { turnComplete: true } });
        }),
        close: vi.fn(),
      };
      return session;
    });

    const { createLiveNarrator } = await import('./liveNarrator');
    const narrator = await createLiveNarrator('key', 'model');

    await narrator.speak('テスト');

    expect(audioContext.resume).toHaveBeenCalledTimes(1);
    expect(audioContext.createBuffer).toHaveBeenCalledTimes(1);
  });

  it('Live API 接続が一時失敗しても再試行で回復できる', async () => {
    const audioContext = new FakeAudioContext('running');
    vi.stubGlobal(
      'AudioContext',
      vi.fn(() => audioContext),
    );
    const { speak } = setupSpeechSynthesis();

    connectMock
      .mockRejectedValueOnce(new Error('temporary network error'))
      .mockImplementationOnce(async ({ callbacks }: { callbacks: ConnectCallbacks }) => {
        const session = {
          sendClientContent: vi.fn(() => {
            callbacks.onmessage({
              serverContent: {
                modelTurn: {
                  parts: [{ inlineData: { data: 'AAA=' } }],
                },
              },
            });
            callbacks.onmessage({ serverContent: { turnComplete: true } });
          }),
          close: vi.fn(),
        };
        return session;
      });

    const { createLiveNarrator } = await import('./liveNarrator');
    const narrator = await createLiveNarrator('key', 'model');

    await narrator.speak('再試行テスト');

    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(audioContext.createBuffer).toHaveBeenCalledTimes(1);
    expect(speak).not.toHaveBeenCalled();
  });

  it(
    'Live API が無応答なら timeout 後に speechSynthesis へフォールバックする',
    { timeout: 10_000 },
    async () => {
      vi.useFakeTimers();
      const audioContext = new FakeAudioContext('running');
      vi.stubGlobal(
        'AudioContext',
        vi.fn(() => audioContext),
      );
      const { speak } = setupSpeechSynthesis();

      connectMock.mockImplementation(async () => ({
        sendClientContent: vi.fn(),
        close: vi.fn(),
      }));

      const { createLiveNarrator } = await import('./liveNarrator');
      const narrator = await createLiveNarrator('key', 'model');
      const speakPromise = narrator.speak('タイムアウトテスト');

      // LIVE_AUDIO_TIMEOUT_MS=30000 × 2 retries + margin
      await vi.advanceTimersByTimeAsync(65_000);
      await speakPromise;

      expect(connectMock).toHaveBeenCalledTimes(2);
      expect(speak).toHaveBeenCalledTimes(1);
    },
  );
});
