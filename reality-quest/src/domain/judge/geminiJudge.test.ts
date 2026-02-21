import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JemieRequest } from '../../types';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

const { createGeminiJudge, parseJudgeResult } = await import('./geminiJudge');

const request: JemieRequest = {
  id: 'req-1',
  category: 'food',
  prompt: 'りんご',
  acceptanceCriteria: 'りんご',
  hintPrompt: '赤い果物',
};

const DUMMY_BASE64 = 'a'.repeat(1200);

describe('parseJudgeResult', () => {
  it('最小JSONを受理し既定値を補う', () => {
    const parsed = parseJudgeResult(
      JSON.stringify({ passed: true, reason: 'ok', confidence: 0.8 }),
    );
    expect(parsed.matchedObjects).toEqual([]);
    expect(parsed.safety).toBe('unknown');
  });

  it('不正JSONは例外', () => {
    expect(() => parseJudgeResult('{"passed":"true"}')).toThrow('Invalid judge response');
  });

  it('fenced JSON と文字列型を正規化できる', () => {
    const parsed = parseJudgeResult(
      [
        '```json',
        '{"passed":"TRUE","reason":"ok","confidence":"85","matchedObjects":"apple","safety":"safe"}',
        '```',
      ].join('\n'),
    );

    expect(parsed.passed).toBe(true);
    expect(parsed.confidence).toBe(0.85);
    expect(parsed.matchedObjects).toEqual(['apple']);
    expect(parsed.safety).toBe('safe');
  });

  it('未知の safety は unknown として扱う', () => {
    const parsed = parseJudgeResult(
      JSON.stringify({
        passed: true,
        reason: 'ok',
        confidence: 0.4,
        safety: 'maybe',
      }),
    );
    expect(parsed.safety).toBe('unknown');
  });

  it('confidence の範囲外は例外', () => {
    expect(() =>
      parseJudgeResult(
        JSON.stringify({
          passed: true,
          reason: 'ok',
          confidence: 1000,
        }),
      ),
    ).toThrow('Invalid judge response');
  });
});

describe('createGeminiJudge', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('正常JSONレスポンスを処理できる', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        passed: true,
        reason: '条件一致',
        confidence: 0.9,
        matchedObjects: ['apple'],
        safety: 'safe',
      }),
    });

    const result = await createGeminiJudge('key').evaluate(DUMMY_BASE64, request);

    expect(result.passed).toBe(true);
    expect(result.matchedObjects).toEqual(['apple']);
  });

  it('不正JSONならフォールバック結果を返す', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'invalid' });

    const result = await createGeminiJudge('key').evaluate(DUMMY_BASE64, request);

    expect(result.passed).toBe(false);
    expect(result.reason.startsWith('AIの判定エラー:')).toBe(true);
  });

  it('空レスポンスならフォールバック結果を返す', async () => {
    mockGenerateContent.mockResolvedValue({ text: '   ' });

    const result = await createGeminiJudge('key').evaluate(DUMMY_BASE64, request);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('empty response');
  });

  it('API例外の詳細を reason に含める', async () => {
    mockGenerateContent.mockRejectedValue({
      status: 429,
      code: 'RESOURCE_EXHAUSTED',
      message: 'quota exceeded',
    });

    const result = await createGeminiJudge('key').evaluate(DUMMY_BASE64, request);

    expect(result.passed).toBe(false);
    expect(result.reason).toContain('status=429');
    expect(result.reason).toContain('code=RESOURCE_EXHAUSTED');
    expect(result.reason).toContain('quota exceeded');
  });

  it('短すぎる imageBase64 は判定しない', async () => {
    const result = await createGeminiJudge('key').evaluate('short', request);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('画像の取得に失敗しました');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
