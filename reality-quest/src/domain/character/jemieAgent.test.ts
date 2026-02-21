import { describe, expect, it } from 'vitest';
import { applyJudgeResult, createInitialState } from './jemieAgent';
import type { GameState, JemieRequest, JudgeResult } from '../../types';

const baseRequest: JemieRequest = {
  id: 'req-1',
  category: 'food',
  prompt: '赤い果物が食べたい！',
  acceptanceCriteria: '赤い果物が見えること',
  hintPrompt: '赤くて丸い果物を探してみて。',
};

const successResult: JudgeResult = {
  passed: true,
  reason: 'apple を検出',
  confidence: 0.91,
  matchedObjects: ['apple'],
  safety: 'safe',
};

const failedResult: JudgeResult = {
  passed: false,
  reason: '対象を検出できない',
  confidence: 0.33,
  matchedObjects: [],
  safety: 'unknown',
};

const baseState: GameState = {
  ...createInitialState('2026-02-21T00:00:00.000Z'),
  phase: 'validating',
  currentRequest: baseRequest,
};

describe('createInitialState', () => {
  it('初期値を返す', () => {
    const state = createInitialState('2026-02-21T00:00:00.000Z');
    expect(state.phase).toBe('menu');
    expect(state.currentRequest).toBeNull();
    expect(state.requestHistory).toHaveLength(0);
  });
});

describe('applyJudgeResult', () => {
  it('成功時に lastJudge と履歴を更新', () => {
    const updated = applyJudgeResult(baseState, successResult, '2026-02-21T00:01:00.000Z');
    expect(updated.lastJudge).toEqual(successResult);
    expect(updated.requestHistory).toHaveLength(1);
    expect(updated.requestHistory[0]?.passed).toBe(true);
    expect(updated.updatedAt).toBe('2026-02-21T00:01:00.000Z');
  });

  it('失敗時に lastJudge と履歴を更新', () => {
    const updated = applyJudgeResult(baseState, failedResult, '2026-02-21T00:01:00.000Z');
    expect(updated.lastJudge).toEqual(failedResult);
    expect(updated.requestHistory).toHaveLength(1);
    expect(updated.requestHistory[0]?.passed).toBe(false);
  });

  it('currentRequest が null の場合は履歴に追加しない', () => {
    const stateNoRequest: GameState = {
      ...baseState,
      currentRequest: null,
    };
    const updated = applyJudgeResult(stateNoRequest, successResult, '2026-02-21T00:01:00.000Z');
    expect(updated.requestHistory).toHaveLength(0);
    expect(updated.lastJudge).toEqual(successResult);
  });

  it('履歴は最大20件に制限される', () => {
    const stateWithHistory: GameState = {
      ...baseState,
      requestHistory: Array.from({ length: 20 }, (_, i) => ({
        requestId: `req-${i}`,
        passed: true,
        confidence: 0.9,
        reason: 'ok',
        timestamp: '2026-02-21T00:00:00.000Z',
      })),
    };
    const updated = applyJudgeResult(stateWithHistory, successResult, '2026-02-21T00:01:00.000Z');
    expect(updated.requestHistory).toHaveLength(20);
    expect(updated.requestHistory[19]?.requestId).toBe('req-1');
  });
});
