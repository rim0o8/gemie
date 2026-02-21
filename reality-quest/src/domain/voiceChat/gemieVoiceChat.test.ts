import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGemieVoiceChat } from './gemieVoiceChat';
import type { MemoryItem, Narrator } from '../../types';

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const createMockNarrator = (): Narrator => ({
  speak: vi.fn(async () => undefined),
  close: vi.fn(),
});

const createMockRecognition = (): SpeechRecognitionLike => ({
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null,
  onerror: null,
  onend: null,
});

const memory: MemoryItem = {
  id: 'mem-1',
  imageUrl: 'https://example.com/img.png',
  summary: '公園でお花見した',
  createdAt: '2026-02-21T00:00:00.000Z',
  sourceRequestId: 'req-1',
  emotionTag: 'happy',
};

describe('createGemieVoiceChat', () => {
  it('SpeechRecognition 未サポート時はエラーステートを返す', () => {
    vi.stubGlobal('window', {});
    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isLiveConnected: false,
        isListening: false,
        lastError: 'SpeechRecognition unsupported',
      }),
    );
  });

  it('SpeechRecognition サポート時は start で認識を開始する', () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();

    expect(MockConstructor).toHaveBeenCalledTimes(1);
    expect(mockRecognition.continuous).toBe(true);
    expect(mockRecognition.lang).toBe('ja-JP');
    expect(mockRecognition.start).toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ isListening: true, isLiveConnected: true }),
    );
  });

  it('stop で認識を停止する', () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();
    chat.stop();

    expect(mockRecognition.stop).toHaveBeenCalled();
    expect(mockRecognition.abort).toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ isListening: false, isLiveConnected: false }),
    );
  });

  it('stop で例外が出てもエラーステートを設定する', () => {
    const mockRecognition = createMockRecognition();
    (mockRecognition.stop as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('stop failed');
    });
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();
    chat.stop();

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lastError: expect.stringContaining('speech recognition stop failed'),
      }),
    );
  });

  it('onresult でナレーターに発話させる', async () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [memory],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();

    const event = {
      resultIndex: 0,
      results: [[{ transcript: 'こんにちは' }]],
    };
    mockRecognition.onresult?.(event);

    await vi.waitFor(() => {
      expect(narrator.speak).toHaveBeenCalledTimes(1);
    });

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({ isSpeaking: true, lastTranscript: 'こんにちは' }),
    );
  });

  it('onresult で空のtranscriptは無視する', () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();

    const event = {
      resultIndex: 0,
      results: [[{ transcript: '' }]],
    };
    mockRecognition.onresult?.(event);

    expect(narrator.speak).not.toHaveBeenCalled();
  });

  it('onerror でエラーステートを設定する', () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();
    mockRecognition.onerror?.({ error: 'not-allowed' } as unknown as Event & { error?: string });

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isListening: false,
        lastError: expect.stringContaining('speech recognition error'),
      }),
    );
  });

  it('onend でアクティブなら自動再開する', () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();
    mockRecognition.onend?.();

    expect(mockRecognition.start).toHaveBeenCalledTimes(2);
  });

  it('onend で非アクティブなら再開しない', () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();
    chat.stop();
    mockRecognition.onend?.();

    // start はchat.start()の1回のみ
    expect(mockRecognition.start).toHaveBeenCalledTimes(1);
  });

  it('onend で再開に失敗したらエラーステートを設定する', () => {
    const mockRecognition = createMockRecognition();
    let startCallCount = 0;
    (mockRecognition.start as ReturnType<typeof vi.fn>).mockImplementation(() => {
      startCallCount++;
      if (startCallCount > 1) throw new Error('restart failed');
    });
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();
    mockRecognition.onend?.();

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lastError: expect.stringContaining('speech recognition restart failed'),
      }),
    );
  });

  it('speakMemoryIntro でナレーターに思い出を話させる', async () => {
    vi.stubGlobal('window', {});
    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    await chat.speakMemoryIntro(memory);

    expect(narrator.speak).toHaveBeenCalledWith(expect.stringContaining('公園でお花見した'));
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ isSpeaking: true }));
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ isSpeaking: false }));
  });

  it('narrator.speak が失敗しても speakMemoryIntro は isSpeaking を false に戻す', async () => {
    vi.stubGlobal('window', {});
    const narrator: Narrator = {
      speak: vi.fn(async () => {
        throw new Error('speak failed');
      }),
      close: vi.fn(),
    };
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    await expect(chat.speakMemoryIntro(memory)).rejects.toThrow('speak failed');

    const lastCall = onStateChange.mock.calls[onStateChange.mock.calls.length - 1]?.[0];
    expect(lastCall?.isSpeaking).toBe(false);
  });

  it('webkitSpeechRecognition もサポートする', () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { webkitSpeechRecognition: MockConstructor });

    const narrator = createMockNarrator();
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();

    expect(MockConstructor).toHaveBeenCalledTimes(1);
    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it('narrator.speak エラー時に lastError を設定する', async () => {
    const mockRecognition = createMockRecognition();
    const MockConstructor = vi.fn(() => mockRecognition);
    vi.stubGlobal('window', { SpeechRecognition: MockConstructor });

    const narrator: Narrator = {
      speak: vi.fn(async () => {
        throw new Error('network error');
      }),
      close: vi.fn(),
    };
    const onStateChange = vi.fn();

    const chat = createGemieVoiceChat({
      narrator,
      getMemories: () => [],
      getLocation: () => null,
      onStateChange,
    });

    chat.start();

    const event = {
      resultIndex: 0,
      results: [[{ transcript: 'テスト発話' }]],
    };
    mockRecognition.onresult?.(event);

    await vi.waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isSpeaking: false,
          lastError: expect.stringContaining('voice reply failed'),
        }),
      );
    });
  });
});
