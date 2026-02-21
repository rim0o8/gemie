import { describe, expect, it } from 'vitest';
import { createInitialState } from '../character/jemieAgent';
import { createGeminiReactionRenderer } from '../reaction/reactionRenderer';
import { createGeminiRequestGenerator } from './requestGenerator';
import type { JudgeResult } from '../../types';

const apiKey = process.env.GOOGLE_API_KEY ?? '';
const model = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash';
const runLive = process.env.LIVE_LLM_TEST === '1' && apiKey.trim().length > 0;
const liveIt = runLive ? it : it.skip;

describe('live llm integration', () => {
  liveIt('createGeminiRequestGenerator が実LLMで要望を返す', { timeout: 30_000 }, async () => {
    const generator = createGeminiRequestGenerator(apiKey, model);
    const state = {
      ...createInitialState('2026-02-21T00:00:00.000Z'),
      requestHistory: [
        {
          requestId: 'seed-object-paper-cup-1',
          passed: true,
          confidence: 0.92,
          reason: 'ok',
          timestamp: '2026-02-21T00:00:00.000Z',
        },
      ] as const,
    };

    const request = await generator.generate(state);

    expect(request.id.length).toBeGreaterThan(0);
    expect(['food', 'scenery', 'object']).toContain(request.category);
    expect(request.prompt.length).toBeGreaterThan(0);
    expect(request.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  liveIt('createGeminiReactionRenderer が実LLMで反応を返す', { timeout: 30_000 }, async () => {
    const renderer = createGeminiReactionRenderer(apiKey, model);
    const judge: JudgeResult = {
      passed: true,
      reason: '赤い飲み物のボトルが確認できた',
      confidence: 0.91,
      matchedObjects: ['bottle', 'drink'],
      safety: 'safe',
    };

    const reaction = await renderer.render('喉乾いたな〜。飲み物を見せてほしいな。', judge);

    expect(reaction.voiceText.length).toBeGreaterThan(0);
    expect(reaction.illustrationPrompt.length).toBeGreaterThan(0);
    expect(reaction.emotionTag.length).toBeGreaterThan(0);
  });
});
