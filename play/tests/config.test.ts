import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('GOOGLE_API_KEY が無ければ例外', () => {
    expect(() => loadConfig({})).toThrowError(/GOOGLE_API_KEY/);
  });

  it('model 未指定ならデフォルト値', () => {
    const config = loadConfig({ GOOGLE_API_KEY: 'test-key' });
    expect(config).toEqual({
      apiKey: 'test-key',
      model: 'gemini-live-2.5-flash-preview',
    });
  });

  it('model を上書きできる', () => {
    const config = loadConfig({
      GOOGLE_API_KEY: 'test-key',
      GEMINI_LIVE_MODEL: 'gemini-2.0-flash-live-001',
    });

    expect(config.model).toBe('gemini-2.0-flash-live-001');
  });
});
