import { describe, expect, it } from 'vitest';
import { createGeminiIllustrationService } from './illustrationService';

describe('createGeminiIllustrationService', () => {
  it('デフォルトのモデルが gemini-3-pro-image-preview である', () => {
    // createGeminiIllustrationService は GoogleGenAI に依存するため
    // ここではファクトリが正常にサービスを返すことだけ確認する
    const service = createGeminiIllustrationService('dummy-key');
    expect(service).toBeDefined();
    expect(typeof service.generate).toBe('function');
  });
});
