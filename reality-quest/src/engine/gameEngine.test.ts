import { describe, expect, it } from 'vitest';
import { createInitialState } from '../domain/character/jemieAgent';
import { isCapturePhase, transition } from './gameEngine';
import type { GameState, JemieRequest, JudgeResult, MemoryItem, ReactionResult } from '../types';

const now = '2026-02-21T00:00:00.000Z';

const request: JemieRequest = {
  id: 'req-1',
  category: 'food',
  prompt: 'りんごが食べたい',
  acceptanceCriteria: 'りんご',
  hintPrompt: '赤い果物を探して',
};

const passed: JudgeResult = {
  passed: true,
  reason: '一致',
  confidence: 0.9,
  matchedObjects: ['apple'],
  safety: 'safe',
};

const failed: JudgeResult = {
  passed: false,
  reason: '不一致',
  confidence: 0.2,
  matchedObjects: [],
  safety: 'unknown',
};

const reaction: ReactionResult = {
  voiceText: 'ありがとう！',
  illustrationPrompt: 'happy mascot with apple',
  emotionTag: 'excited',
};

const memory: MemoryItem = {
  id: 'mem-1',
  imageUrl: 'https://example.com/memory.png',
  summary: 'りんごをくれてありがとう',
  createdAt: now,
  sourceRequestId: 'req-1',
  emotionTag: 'excited',
};

describe('createInitialState', () => {
  it('初期値を返す', () => {
    const state = createInitialState(now);
    expect(state.phase).toBe('menu');
    expect(state.currentRequest).toBeNull();
  });
});

describe('transition', () => {
  it('START_AR で listening へ遷移', () => {
    const state = transition(createInitialState(now), { type: 'START_AR', occurredAt: now });
    expect(state.phase).toBe('listening');
  });

  it('menu で RESET は初期化', () => {
    const state = transition(createInitialState(now), { type: 'RESET', occurredAt: now });
    expect(state.phase).toBe('menu');
  });

  it('requesting -> waiting_capture', () => {
    const listening = transition(createInitialState(now), { type: 'START_AR', occurredAt: now });
    const requesting = transition(listening, { type: 'REQUEST_READY', request, occurredAt: now });
    const waiting = transition(requesting, { type: 'REQUEST_SPOKEN', occurredAt: now });

    expect(requesting.phase).toBe('requesting');
    expect(waiting.phase).toBe('waiting_capture');
    expect(waiting.currentRequest?.id).toBe('req-1');
  });

  it('waiting_capture で ERROR_OCCURRED -> error', () => {
    const waitingState: GameState = {
      ...createInitialState(now),
      phase: 'waiting_capture',
      currentRequest: request,
    };
    const state = transition(waitingState, {
      type: 'ERROR_OCCURRED',
      reason: 'test',
      occurredAt: now,
    });
    expect(state.phase).toBe('error');
  });

  it('waiting_capture で不正イベントは変化なし', () => {
    const waitingState: GameState = {
      ...createInitialState(now),
      phase: 'waiting_capture',
      currentRequest: request,
    };
    const state = transition(waitingState, { type: 'REQUEST_SPOKEN', occurredAt: now });
    expect(state).toEqual(waitingState);
  });

  it('validating で成功すると reaction へ遷移し履歴更新', () => {
    const waitingState: GameState = {
      ...createInitialState(now),
      phase: 'waiting_capture',
      currentRequest: request,
    };

    const validating = transition(waitingState, {
      type: 'CAPTURE_SUBMIT',
      imageBase64: 'abc',
      occurredAt: now,
    });
    const reacted = transition(validating, {
      type: 'JUDGE_PASSED',
      result: passed,
      occurredAt: now,
    });

    expect(reacted.phase).toBe('reaction');
    expect(reacted.requestHistory).toHaveLength(1);
    expect(reacted.lastJudge).toEqual(passed);
  });

  it('validating で失敗すると waiting_capture に戻る', () => {
    const validating: GameState = {
      ...createInitialState(now),
      phase: 'validating',
      currentRequest: request,
    };

    const next = transition(validating, {
      type: 'JUDGE_FAILED',
      result: failed,
      occurredAt: now,
    });

    expect(next.phase).toBe('waiting_capture');
    expect(next.requestHistory).toHaveLength(1);
    expect(next.lastJudge).toEqual(failed);
  });

  it('validating で ERROR_OCCURRED と RESET を処理できる', () => {
    const validating: GameState = {
      ...createInitialState(now),
      phase: 'validating',
      currentRequest: request,
    };

    const errored = transition(validating, {
      type: 'ERROR_OCCURRED',
      reason: 'judge timeout',
      occurredAt: now,
    });
    expect(errored.phase).toBe('error');

    const reset = transition(validating, { type: 'RESET', occurredAt: now });
    expect(reset.phase).toBe('menu');
  });

  it('validating で不正イベントは変化なし', () => {
    const validating: GameState = {
      ...createInitialState(now),
      phase: 'validating',
      currentRequest: request,
    };
    const next = transition(validating, { type: 'REQUEST_SPOKEN', occurredAt: now });
    expect(next).toEqual(validating);
  });

  it('reaction でエラーイベントなら error', () => {
    const reactionState: GameState = {
      ...createInitialState(now),
      phase: 'reaction',
      currentRequest: request,
    };
    const next = transition(reactionState, {
      type: 'ERROR_OCCURRED',
      reason: 'reaction failed',
      occurredAt: now,
    });
    expect(next.phase).toBe('error');
  });

  it('reaction で RESET と不正イベントを処理できる', () => {
    const reactionState: GameState = {
      ...createInitialState(now),
      phase: 'reaction',
      currentRequest: request,
    };
    const reset = transition(reactionState, { type: 'RESET', occurredAt: now });
    expect(reset.phase).toBe('menu');

    const unchanged = transition(reactionState, { type: 'REQUEST_SPOKEN', occurredAt: now });
    expect(unchanged).toEqual(reactionState);
  });

  it('REACTION_DONE で次要望生成待ちへ戻る', () => {
    const reactionState: GameState = {
      ...createInitialState(now),
      phase: 'reaction',
      currentRequest: request,
    };

    const next = transition(reactionState, {
      type: 'REACTION_DONE',
      reaction,
      illustrationUrl: 'https://example.com/a.png',
      occurredAt: now,
    });

    expect(next.phase).toBe('requesting');
    expect(next.currentRequest).toBeNull();
    expect(next.lastIllustrationUrl).toBe('https://example.com/a.png');
  });

  it('error から START_AR で listening に戻る', () => {
    const errored: GameState = {
      ...createInitialState(now),
      phase: 'error',
    };
    const next = transition(errored, { type: 'START_AR', occurredAt: now });
    expect(next.phase).toBe('listening');
  });

  it('error でその他イベントは updatedAt のみ更新', () => {
    const errored: GameState = {
      ...createInitialState('2026-02-21T00:00:00.000Z'),
      phase: 'error',
      updatedAt: '2026-02-21T00:00:00.000Z',
    };
    const next = transition(errored, {
      type: 'REQUEST_SPOKEN',
      occurredAt: '2026-02-21T00:10:00.000Z',
    });
    expect(next.phase).toBe('error');
    expect(next.updatedAt).toBe('2026-02-21T00:10:00.000Z');
  });

  it('MEMORY_SAVED で memory が追記される', () => {
    const base = createInitialState(now);
    const next = transition(base, { type: 'MEMORY_SAVED', memory, occurredAt: now });
    expect(next.memories).toHaveLength(1);
    expect(next.memories[0]?.id).toBe('mem-1');
  });

  it('capture phase 判定', () => {
    expect(isCapturePhase('waiting_capture')).toBe(true);
    expect(isCapturePhase('validating')).toBe(true);
    expect(isCapturePhase('reaction')).toBe(true);
    expect(isCapturePhase('menu')).toBe(false);
  });
});
