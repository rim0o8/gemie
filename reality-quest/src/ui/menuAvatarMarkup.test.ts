import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('menu avatar markup', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

  it('gemie avatar image element が存在する', () => {
    expect(html).toContain('id="gemie-menu-avatar"');
  });

  it('avatar image src が正しい', () => {
    expect(html).toContain('src="/gemie.png"');
  });
});
