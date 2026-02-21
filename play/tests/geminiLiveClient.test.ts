import { describe, expect, it, vi } from 'vitest';

const { connectMock, GoogleGenAIMock } = vi.hoisted(() => {
  const localConnectMock = vi.fn();
  const localGoogleGenAIMock = vi.fn(() => ({
    live: {
      connect: localConnectMock,
    },
  }));
  return {
    connectMock: localConnectMock,
    GoogleGenAIMock: localGoogleGenAIMock,
  };
});

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: GoogleGenAIMock,
    Modality: { TEXT: 'TEXT' },
  };
});

import { createLiveConnect } from '../src/geminiLiveClient';

describe('createLiveConnect', () => {
  it('SDKに正しい設定で接続する', async () => {
    const sendClientContent = vi.fn(() => undefined);
    const close = vi.fn(() => undefined);
    connectMock.mockResolvedValueOnce({ sendClientContent, close });

    const onmessage = vi.fn();
    const onerror = vi.fn();
    const connect = createLiveConnect();
    const session = await connect({
      apiKey: 'api-key',
      model: 'gemini-live-2.5-flash-preview',
      callbacks: { onmessage, onerror },
    });

    expect(GoogleGenAIMock).toHaveBeenCalledWith({ apiKey: 'api-key', apiVersion: 'v1alpha' });
    expect(connectMock).toHaveBeenCalledWith({
      model: 'gemini-live-2.5-flash-preview',
      config: { responseModalities: ['TEXT'] },
      callbacks: {
        onmessage,
        onerror: expect.any(Function),
        onclose: expect.any(Function),
      },
    });

    session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: 'hello' }] }],
      turnComplete: true,
    });
    session.close();

    expect(sendClientContent).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('SDK onerror を Error として転送する', async () => {
    connectMock.mockImplementationOnce(async ({ callbacks }) => {
      callbacks.onerror({ error: new Error('socket error') });
      return {
        sendClientContent: vi.fn(() => undefined),
        close: vi.fn(() => undefined),
      };
    });

    const onerror = vi.fn();
    const connect = createLiveConnect();
    await connect({
      apiKey: 'api-key',
      model: 'gemini-live-2.5-flash-preview',
      callbacks: { onmessage: vi.fn(), onerror },
    });

    expect(onerror).toHaveBeenCalledWith(expect.objectContaining({ message: 'socket error' }));
  });

  it('SDK onerror の error が無い場合はフォールバックを使う', async () => {
    connectMock.mockImplementationOnce(async ({ callbacks }) => {
      callbacks.onerror({});
      return {
        sendClientContent: vi.fn(() => undefined),
        close: vi.fn(() => undefined),
      };
    });

    const onerror = vi.fn();
    const connect = createLiveConnect();
    await connect({
      apiKey: 'api-key',
      model: 'gemini-live-2.5-flash-preview',
      callbacks: { onmessage: vi.fn(), onerror },
    });

    expect(onerror).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Live API connection error' }),
    );
  });

  it('SDK onclose を必要情報だけ転送する', async () => {
    connectMock.mockImplementationOnce(async ({ callbacks }) => {
      callbacks.onclose({ code: 1006, reason: 'abnormal', wasClean: false });
      return {
        sendClientContent: vi.fn(() => undefined),
        close: vi.fn(() => undefined),
      };
    });

    const onclose = vi.fn();
    const connect = createLiveConnect();
    await connect({
      apiKey: 'api-key',
      model: 'gemini-live-2.5-flash-preview',
      callbacks: { onmessage: vi.fn(), onclose },
    });

    expect(onclose).toHaveBeenCalledWith({ code: 1006, reason: 'abnormal', wasClean: false });
  });
});
