import { describe, expect, it } from 'vitest';
import { createInitialState } from '../character/jemieAgent';
import { createRequestGenerator, parseRequestResponse } from './requestGenerator';
import { SEED_REQUESTS } from '../character/quests';
import type { JemieRequest } from '../../types';

const now = '2026-02-21T00:00:00.000Z';

describe('parseRequestResponse', () => {
  it('JSON文字列をRequestへ変換する', () => {
    const text = JSON.stringify({
      id: 'req-100',
      category: 'food',
      prompt: 'りんごを見せて！',
      acceptanceCriteria: '赤いりんご',
      hintPrompt: '果物コーナーを探してみて。',
    });

    const parsed = parseRequestResponse(text);

    expect(parsed.id).toBe('req-100');
    expect(parsed.category).toBe('food');
  });

  it('スキーマ不一致は例外', () => {
    expect(() => parseRequestResponse('{"id":123}')).toThrow('Invalid request response');
  });

  it('fenced JSON もRequestに変換できる', () => {
    const parsed = parseRequestResponse(
      [
        '```json',
        '{"id":"req-200","category":"object","prompt":"ぬいぐるみ見せて","acceptanceCriteria":"ぬいぐるみ","hintPrompt":"棚を見て"}',
        '```',
      ].join('\n'),
    );

    expect(parsed.id).toBe('req-200');
    expect(parsed.category).toBe('object');
  });
});

describe('createRequestGenerator', () => {
  it('初回はseed request（紙コップ）を返す', async () => {
    const gen = createRequestGenerator({
      generateText: async () => {
        throw new Error('should not call llm on first request');
      },
      now: () => now,
    });

    const result = await gen.generate(createInitialState(now));
    expect(result).toEqual(SEED_REQUESTS[0]);
  });

  it('LLM応答を返せる', async () => {
    const request: JemieRequest = {
      id: 'req-101',
      category: 'scenery',
      prompt: '青空が見たい！',
      acceptanceCriteria: '空と青色',
      hintPrompt: '窓の外を見せて。',
    };

    const gen = createRequestGenerator({
      generateText: async () => JSON.stringify(request),
      now: () => now,
    });

    const state = {
      ...createInitialState(now),
      requestHistory: [
        {
          requestId: 'seed-object-paper-cup-1',
          passed: true,
          confidence: 0.9,
          reason: 'ok',
          timestamp: now,
        },
      ] as const,
    };
    const result = await gen.generate(state);

    expect(result).toEqual(request);
  });

  it('異常応答時はfallback requestを返す', async () => {
    const gen = createRequestGenerator({
      generateText: async () => 'invalid-json',
      now: () => now,
    });

    const state = {
      ...createInitialState(now),
      requestHistory: [
        {
          requestId: 'seed-object-paper-cup-1',
          passed: true,
          confidence: 0.9,
          reason: 'ok',
          timestamp: now,
        },
      ] as const,
    };
    const result = await gen.generate(state);

    expect(result.id).toContain('fallback-');
    expect(result.prompt.length).toBeGreaterThan(0);
  });

  it('朝の時刻では朝のfallback requestを返す', async () => {
    const morningNow = '2026-02-21T08:00:00.000Z';
    const gen = createRequestGenerator({
      generateText: async () => 'invalid-json',
      now: () => morningNow,
    });

    const state = {
      ...createInitialState(morningNow),
      requestHistory: [
        {
          requestId: 'seed-object-paper-cup-1',
          passed: true,
          confidence: 0.9,
          reason: 'ok',
          timestamp: morningNow,
        },
      ] as const,
    };
    const result = await gen.generate(state);

    expect(result.id).toContain('fallback-');
    expect(result.category).toBe('scenery');
  });

  it('昼の時刻では食べ物系のfallback requestを返す', async () => {
    const daytimeNow = '2026-02-21T12:00:00.000Z';
    const gen = createRequestGenerator({
      generateText: async () => 'invalid-json',
      now: () => daytimeNow,
    });

    const state = {
      ...createInitialState(daytimeNow),
      requestHistory: [
        {
          requestId: 'seed-object-paper-cup-1',
          passed: true,
          confidence: 0.9,
          reason: 'ok',
          timestamp: daytimeNow,
        },
      ] as const,
    };
    const result = await gen.generate(state);

    expect(result.id).toContain('fallback-');
    expect(result.category).toBe('food');
  });

  it('夜の時刻ではobject系のfallback requestを返す', async () => {
    const nightNow = '2026-02-21T22:00:00.000Z';
    const gen = createRequestGenerator({
      generateText: async () => 'invalid-json',
      now: () => nightNow,
    });

    const state = {
      ...createInitialState(nightNow),
      requestHistory: [
        {
          requestId: 'seed-object-paper-cup-1',
          passed: true,
          confidence: 0.9,
          reason: 'ok',
          timestamp: nightNow,
        },
      ] as const,
    };
    const result = await gen.generate(state);

    expect(result.id).toContain('fallback-');
    expect(result.category).toBe('object');
  });
});
