import { describe, expect, it } from 'vitest';
import {
  GEMIE_CHARACTER_BIBLE,
  buildEmotionIllustrationPrompt,
  buildGreetingIllustrationPrompt,
  buildMemoryIllustrationPrompt,
} from './gemieCharacter';

describe('gemieCharacter', () => {
  it('greeting prompt に waving 指示が入る', () => {
    const prompt = buildGreetingIllustrationPrompt();
    expect(prompt).toContain('waving');
    expect(prompt).toContain('Gemie');
  });

  it('emotion prompt が emotionTag と sceneHint を含む', () => {
    const prompt = buildEmotionIllustrationPrompt('excited', 'found favorite snack');
    expect(prompt).toContain('excited');
    expect(prompt).toContain('found favorite snack');
    expect(prompt).toContain(GEMIE_CHARACTER_BIBLE);
  });

  it('memory illustration prompt にキャラ設定と場面コンテキストが含まれる', () => {
    const prompt = buildMemoryIllustrationPrompt('美味しいラーメンを見つけた', 'happy');
    expect(prompt).toContain(GEMIE_CHARACTER_BIBLE);
    expect(prompt).toContain('美味しいラーメンを見つけた');
    expect(prompt).toContain('happy');
    expect(prompt).toContain('food');
  });

  it('memory illustration prompt で emotionTag が null のとき happy and curious が入る', () => {
    const prompt = buildMemoryIllustrationPrompt('綺麗な景色', null);
    expect(prompt).toContain('happy and curious');
    expect(prompt).not.toContain('null');
  });
});
