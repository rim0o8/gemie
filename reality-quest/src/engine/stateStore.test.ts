import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../domain/character/jemieAgent';
import { createStateStore } from './stateStore';
import type { GameState } from '../types';

const storageFactory = () => {
  const mem = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => mem.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mem.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      mem.delete(key);
    }),
  };
};

describe('createStateStore', () => {
  const key = 'jemie-state';
  let storage: ReturnType<typeof storageFactory>;

  beforeEach(() => {
    storage = storageFactory();
  });

  it('保存と復元ができる', () => {
    const store = createStateStore({ storage, storageKey: key });
    const state: GameState = {
      ...createInitialState('2026-02-21T00:00:00.000Z'),
      updatedAt: '2026-02-21T00:05:00.000Z',
    };

    store.save(state);
    const restored = store.load('2026-02-21T00:10:00.000Z');

    expect(restored.updatedAt).toBe('2026-02-21T00:05:00.000Z');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('壊れたJSONなら初期状態へフォールバックし、破損データを削除', () => {
    storage.setItem(key, '{"bad":');
    const store = createStateStore({ storage, storageKey: key });

    const restored = store.load('2026-02-21T00:10:00.000Z');

    expect(restored.phase).toBe('menu');
    expect(storage.removeItem).toHaveBeenCalledWith(key);
  });

  it('スキーマ不一致でも初期状態へフォールバックする', () => {
    storage.setItem(key, JSON.stringify({ phase: 'menu' }));
    const store = createStateStore({ storage, storageKey: key });

    const restored = store.load('2026-02-21T00:10:00.000Z');

    expect(restored.phase).toBe('menu');
    expect(storage.removeItem).toHaveBeenCalledWith(key);
  });

  it('旧フォーマットでも memories と conversation にデフォルトが入る', () => {
    const legacy = {
      ...createInitialState('2026-02-21T00:00:00.000Z'),
    };
    delete (legacy as { memories?: unknown }).memories;
    delete (legacy as { conversation?: unknown }).conversation;
    storage.setItem(key, JSON.stringify(legacy));
    const store = createStateStore({ storage, storageKey: key });

    const restored = store.load('2026-02-21T00:10:00.000Z');

    expect(restored.memories).toEqual([]);
    expect(restored.conversation.isLiveConnected).toBe(false);
  });
});
