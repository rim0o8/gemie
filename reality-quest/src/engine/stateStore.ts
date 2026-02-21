import { createInitialState } from '../domain/character/jemieAgent';
import { stateSchema } from '../shared/schemas';
import type { GameState } from '../types';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type StateStore = {
  readonly load: (now?: string) => GameState;
  readonly save: (state: GameState) => void;
};

type CreateStateStoreOptions = {
  readonly storage: StorageLike;
  readonly storageKey: string;
};

export const createStateStore = (options: CreateStateStoreOptions): StateStore => ({
  load: (now: string = new Date().toISOString()): GameState => {
    const raw = options.storage.getItem(options.storageKey);
    if (!raw) {
      return createInitialState(now);
    }

    try {
      const parsed = stateSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        options.storage.removeItem(options.storageKey);
        return createInitialState(now);
      }
      return parsed.data;
    } catch {
      options.storage.removeItem(options.storageKey);
      return createInitialState(now);
    }
  },
  save: (state: GameState): void => {
    const sanitized = { ...state, location: null };
    options.storage.setItem(options.storageKey, JSON.stringify(sanitized));
  },
});
