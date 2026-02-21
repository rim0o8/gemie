import { describe, expect, it } from 'vitest';
import { createReactionRenderer, parseReactionResponse } from './reactionRenderer';
import type { JudgeResult } from '../../types';

const result: JudgeResult = {
  passed: true,
  reason: '条件一致',
  confidence: 0.95,
  matchedObjects: ['apple'],
  safety: 'safe',
};

describe('parseReactionResponse', () => {
  it('JSON文字列をReactionResultへ変換する', () => {
    const parsed = parseReactionResponse(
      JSON.stringify({
        voiceText: 'ありがとう！うれしい！',
        illustrationPrompt: 'happy mascot eating apple',
        emotionTag: 'excited',
      }),
    );

    expect(parsed.emotionTag).toBe('excited');
  });

  it('不正形式は例外', () => {
    expect(() => parseReactionResponse('{"voiceText":1}')).toThrow('Invalid reaction response');
  });

  it('fenced JSON を受け取っても変換できる', () => {
    const parsed = parseReactionResponse(
      [
        '```json',
        '{"voiceText":"ありがとう！","illustrationPrompt":"cute mascot","emotionTag":"happy"}',
        '```',
      ].join('\n'),
    );

    expect(parsed.voiceText).toBe('ありがとう！');
    expect(parsed.emotionTag).toBe('happy');
  });
});

describe('createReactionRenderer', () => {
  it('LLM応答を返せる', async () => {
    const renderer = createReactionRenderer({
      generateText: async () =>
        JSON.stringify({
          voiceText: 'やった！',
          illustrationPrompt: 'character celebrates with fruit',
          emotionTag: 'excited',
        }),
    });

    const reaction = await renderer.render('赤い果物が食べたい', result);

    expect(reaction.voiceText).toBe('やった！');
    expect(reaction.emotionTag).toBe('excited');
  });

  it('異常応答時はfallback reactionを返す', async () => {
    const renderer = createReactionRenderer({
      generateText: async () => 'invalid',
    });

    const reaction = await renderer.render('赤い果物が食べたい', result);

    expect(reaction.voiceText.length).toBeGreaterThan(0);
    expect(reaction.illustrationPrompt.length).toBeGreaterThan(0);
  });
});
