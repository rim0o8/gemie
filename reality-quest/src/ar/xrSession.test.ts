import { beforeEach, describe, expect, it, vi } from 'vitest';

const setupHitTestMock = vi.fn();

vi.mock('./hitTest', () => ({
  setupHitTest: setupHitTestMock,
}));

const { createXRSessionState, onSessionStart, onSessionEnd } = await import('./xrSession');

type ListenerMap = Record<string, () => void>;

const createRendererStub = (
  session: XRSession | null,
): { renderer: unknown; listeners: ListenerMap } => {
  const listeners: ListenerMap = {};
  const renderer = {
    xr: {
      addEventListener: vi.fn((name: string, handler: () => void) => {
        listeners[name] = handler;
      }),
      getSession: vi.fn(() => session),
    },
  };
  return { renderer, listeners };
};

describe('xrSession', () => {
  beforeEach(() => {
    setupHitTestMock.mockReset();
  });

  it('createXRSessionState は初期値を返す', () => {
    const state = createXRSessionState();
    expect(state.session).toBeNull();
    expect(state.refSpace).toBeNull();
    expect(state.hitTestSource).toBeNull();
  });

  it('sessionstart 時に state を更新して onReady を呼ぶ', async () => {
    const refSpace = {} as XRReferenceSpace;
    const hitTestSource = {} as XRHitTestSource;
    const session = {
      requestReferenceSpace: vi.fn(async () => refSpace),
    } as unknown as XRSession;
    setupHitTestMock.mockResolvedValue(hitTestSource);
    const state = createXRSessionState();
    const onReady = vi.fn();
    const { renderer, listeners } = createRendererStub(session);

    onSessionStart(renderer as never, state, onReady);
    listeners.sessionstart?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(session.requestReferenceSpace).toHaveBeenCalledWith('local');
    expect(setupHitTestMock).toHaveBeenCalledWith(session, refSpace);
    expect(state.session).toBe(session);
    expect(state.refSpace).toBe(refSpace);
    expect(state.hitTestSource).toBe(hitTestSource);
    expect(onReady).toHaveBeenCalledWith(state);
  });

  it('onSessionEnd は sessionend listener を登録する', () => {
    const onEnd = vi.fn();
    const { renderer, listeners } = createRendererStub(null);

    onSessionEnd(renderer as never, onEnd);
    listeners.sessionend?.();

    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
