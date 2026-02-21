import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig } from './config';

describe('parseRuntimeConfig', () => {
  it('有効なenvを受け取ると設定を返す', () => {
    const result = parseRuntimeConfig({
      VITE_GOOGLE_API_KEY: 'test-key',
      VITE_GEMINI_LIVE_MODEL: 'gemini-2.0-flash-live-001',
      VITE_API_BASE_URL: 'https://example.com/api',
    });

    expect(result.apiKey).toBe('test-key');
    expect(result.liveModel).toBe('gemini-2.0-flash-live-001');
    expect(result.apiBaseUrl).toBe('https://example.com/api');
  });

  it('VITE_GEMINI_LIVE_MODEL が未設定ならデフォルトを採用する', () => {
    const result = parseRuntimeConfig({
      VITE_GOOGLE_API_KEY: 'test-key',
    });

    expect(result.liveModel).toBe('gemini-2.5-flash-native-audio-preview-12-2025');
    expect(result.textModel).toBe('gemini-2.5-flash');
    expect(result.imageModel).toBe('gemini-3-pro-image-preview');
    expect(result.apiBaseUrl).toBe('/api');
  });

  it('VITE_GOOGLE_API_KEY が空文字だと例外を投げる', () => {
    expect(() => {
      parseRuntimeConfig({
        VITE_GOOGLE_API_KEY: '',
      });
    }).toThrowError('Invalid runtime environment variables');
  });
});
