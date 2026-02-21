import { describe, expect, it } from 'vitest';
import { createInitialState } from '../domain/character/jemieAgent';
import { getUIPhaseModel } from './uiPhaseModel';
import type { GameState } from '../types';

const now = '2026-02-21T00:00:00.000Z';

describe('getUIPhaseModel', () => {
  it('menu では request panel を表示しない', () => {
    const model = getUIPhaseModel(createInitialState(now));
    expect(model.showRequestPanel).toBe(false);
    expect(model.captureEnabled).toBe(false);
  });

  it('waiting_capture では capture が有効で request panel を表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'waiting_capture',
      currentRequest: {
        id: 'req-1',
        category: 'object',
        prompt: '紙コップを見せて',
        acceptanceCriteria: '紙コップが写っている',
        hintPrompt: '白い紙カップを探して',
      },
    };
    const model = getUIPhaseModel(state);
    expect(model.showRequestPanel).toBe(true);
    expect(model.captureEnabled).toBe(true);
    expect(model.showLoading).toBe(false);
  });

  it('requesting ではステータスメッセージを表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'requesting',
      currentRequest: {
        id: 'req-1',
        category: 'object',
        prompt: '紙コップを見せて',
        acceptanceCriteria: '紙コップが写っている',
        hintPrompt: '白い紙カップを探して',
      },
    };
    const model = getUIPhaseModel(state);
    expect(model.statusTone).toBe('normal');
    expect(model.statusMessage).toContain('お話し中');
  });

  it('waiting_capture ではステータス表示なし', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'waiting_capture',
      currentRequest: {
        id: 'req-1',
        category: 'object',
        prompt: '紙コップを見せて',
        acceptanceCriteria: '紙コップが写っている',
        hintPrompt: '白い紙カップを探して',
      },
    };
    const model = getUIPhaseModel(state);
    expect(model.statusMessage).toBeNull();
  });

  it('error ではエラーバナーを表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'error',
    };
    const model = getUIPhaseModel(state);
    expect(model.showErrorBanner).toBe(true);
    expect(model.statusTone).toBe('error');
  });

  it('listening ではパネル非表示でキャプチャ無効、ローディング表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'listening',
    };
    const model = getUIPhaseModel(state);
    expect(model.showRequestPanel).toBe(false);
    expect(model.captureEnabled).toBe(false);
    expect(model.showLoading).toBe(true);
    expect(model.statusMessage).toContain('接続中');
  });

  it('validating ではローディング表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'validating',
      currentRequest: {
        id: 'req-1',
        category: 'object',
        prompt: '紙コップを見せて',
        acceptanceCriteria: '紙コップが写っている',
        hintPrompt: '白い紙カップを探して',
      },
    };
    const model = getUIPhaseModel(state);
    expect(model.showLoading).toBe(true);
    expect(model.captureEnabled).toBe(false);
    expect(model.statusMessage).toContain('確認中');
    expect(model.showRequestPanel).toBe(true);
  });

  it('reaction では成功トーンで喜び表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'reaction',
      currentRequest: {
        id: 'req-1',
        category: 'object',
        prompt: '紙コップを見せて',
        acceptanceCriteria: '紙コップが写っている',
        hintPrompt: '白い紙カップを探して',
      },
    };
    const model = getUIPhaseModel(state);
    expect(model.statusTone).toBe('success');
    expect(model.showLoading).toBe(false);
    expect(model.captureEnabled).toBe(false);
    expect(model.showRequestPanel).toBe(true);
    expect(model.statusMessage).toContain('喜んでいます');
  });
});
