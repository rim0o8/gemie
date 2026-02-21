import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  showRequestPanel,
  hideRequestPanel,
  setStatusMessage,
  clearStatusMessage,
  showLoadingSpinner,
  hideLoadingSpinner,
  setCaptureButtonEnabled,
  onCaptureClick,
  onRetryClick,
  onBackToMenuClick,
  showErrorBanner,
  hideErrorBanner,
  showMemoryRecallOverlay,
  hideMemoryRecallOverlay,
  setMemoryRecallImage,
  setMemoryRecallCaption,
  setMemoryRecallLoading,
  setMemoryRecallVoiceState,
  onMemoryRecallClick,
  onRecallCloseClick,
} from './domOverlay';

const createElement = (id: string, extras: Record<string, unknown> = {}): HTMLElement => {
  const el = {
    id,
    textContent: '',
    className: '',
    classList: {
      add: vi.fn((cls: string) => {
        el.className = el.className ? `${el.className} ${cls}` : cls;
      }),
      remove: vi.fn((cls: string) => {
        el.className = el.className
          .split(' ')
          .filter((c: string) => c !== cls)
          .join(' ');
      }),
    },
    addEventListener: vi.fn(),
    removeAttribute: vi.fn(),
    disabled: false,
    src: '',
    ...extras,
  } as unknown as HTMLElement;
  return el;
};

describe('domOverlay', () => {
  let elements: Map<string, HTMLElement>;

  beforeEach(() => {
    elements = new Map();
    vi.stubGlobal('document', {
      getElementById: vi.fn((id: string) => elements.get(id) ?? null),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('showRequestPanel でパネルを表示しタイトル・説明を設定する', () => {
    const panel = createElement('quest-panel');
    const title = createElement('quest-title');
    const desc = createElement('quest-description');
    elements.set('quest-panel', panel);
    elements.set('quest-title', title);
    elements.set('quest-description', desc);

    showRequestPanel('お願い', '赤い果物を見せて');

    expect(title.textContent).toBe('お願い');
    expect(desc.textContent).toBe('赤い果物を見せて');
    expect(panel.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('hideRequestPanel でパネルを非表示にする', () => {
    const panel = createElement('quest-panel');
    elements.set('quest-panel', panel);

    hideRequestPanel();

    expect(panel.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('setStatusMessage でメッセージとタイプを設定する', () => {
    const el = createElement('status-message');
    elements.set('status-message', el);

    setStatusMessage('成功です', 'success');

    expect(el.textContent).toBe('成功です');
    expect(el.classList.add).toHaveBeenCalledWith('success');
  });

  it('setStatusMessage でerrorタイプを設定する', () => {
    const el = createElement('status-message');
    elements.set('status-message', el);

    setStatusMessage('エラー', 'error');

    expect(el.textContent).toBe('エラー');
    expect(el.classList.add).toHaveBeenCalledWith('error');
  });

  it('setStatusMessage でnormalタイプはクラスを追加しない', () => {
    const el = createElement('status-message');
    elements.set('status-message', el);

    setStatusMessage('通常', 'normal');

    expect(el.textContent).toBe('通常');
    expect(el.classList.add).not.toHaveBeenCalled();
  });

  it('setStatusMessage で要素がなければ何もしない', () => {
    expect(() => setStatusMessage('msg', 'normal')).not.toThrow();
  });

  it('clearStatusMessage でメッセージをクリアする', () => {
    const el = createElement('status-message');
    el.textContent = 'old';
    el.className = 'visible';
    elements.set('status-message', el);

    clearStatusMessage();

    expect(el.textContent).toBe('');
    expect(el.className).toBe('');
  });

  it('showLoadingSpinner / hideLoadingSpinner', () => {
    const el = createElement('loading-spinner');
    elements.set('loading-spinner', el);

    showLoadingSpinner();
    expect(el.classList.add).toHaveBeenCalledWith('visible');

    hideLoadingSpinner();
    expect(el.classList.remove).toHaveBeenCalledWith('visible');
  });

  it('setCaptureButtonEnabled でボタンを有効/無効にする', () => {
    const btn = createElement('capture-btn', { disabled: true });
    elements.set('capture-btn', btn);

    setCaptureButtonEnabled(true);
    expect((btn as unknown as { disabled: boolean }).disabled).toBe(false);

    setCaptureButtonEnabled(false);
    expect((btn as unknown as { disabled: boolean }).disabled).toBe(true);
  });

  it('onCaptureClick でクリックハンドラを登録する', () => {
    const btn = createElement('capture-btn');
    elements.set('capture-btn', btn);
    const handler = vi.fn();

    onCaptureClick(handler);

    expect(btn.addEventListener).toHaveBeenCalledWith('click', handler);
  });

  it('onRetryClick でクリックハンドラを登録する', () => {
    const btn = createElement('retry-btn');
    elements.set('retry-btn', btn);
    const handler = vi.fn();

    onRetryClick(handler);

    expect(btn.addEventListener).toHaveBeenCalledWith('click', handler);
  });

  it('onBackToMenuClick でクリックハンドラを登録する', () => {
    const btn = createElement('back-menu-btn');
    elements.set('back-menu-btn', btn);
    const handler = vi.fn();

    onBackToMenuClick(handler);

    expect(btn.addEventListener).toHaveBeenCalledWith('click', handler);
  });

  it('showErrorBanner でバナーを表示する', () => {
    const banner = createElement('error-banner');
    const body = createElement('error-message');
    elements.set('error-banner', banner);
    elements.set('error-message', body);

    showErrorBanner('致命的エラー');

    expect(body.textContent).toBe('致命的エラー');
    expect(banner.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('showErrorBanner で要素がなければ何もしない', () => {
    expect(() => showErrorBanner('エラー')).not.toThrow();
  });

  it('hideErrorBanner でバナーを隠す', () => {
    const banner = createElement('error-banner');
    elements.set('error-banner', banner);

    hideErrorBanner();

    expect(banner.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('showMemoryRecallOverlay / hideMemoryRecallOverlay', () => {
    const el = createElement('memory-recall-overlay');
    elements.set('memory-recall-overlay', el);

    showMemoryRecallOverlay();
    expect(el.classList.add).toHaveBeenCalledWith('visible');

    hideMemoryRecallOverlay();
    expect(el.classList.remove).toHaveBeenCalledWith('visible');
  });

  it('setMemoryRecallImage で画像srcを設定する', () => {
    const img = createElement('memory-recall-image', { src: '' });
    elements.set('memory-recall-image', img);

    setMemoryRecallImage('data:image/png;base64,abc');
    expect((img as unknown as { src: string }).src).toBe('data:image/png;base64,abc');
  });

  it('setMemoryRecallCaption でキャプションを設定する', () => {
    const el = createElement('memory-recall-caption');
    elements.set('memory-recall-caption', el);

    setMemoryRecallCaption('思い出のキャプション');
    expect(el.textContent).toBe('思い出のキャプション');
  });

  it('setMemoryRecallLoading で表示/非表示を切り替える', () => {
    const el = createElement('memory-recall-loading');
    elements.set('memory-recall-loading', el);

    setMemoryRecallLoading(true);
    expect(el.classList.add).toHaveBeenCalledWith('visible');

    setMemoryRecallLoading(false);
    expect(el.classList.remove).toHaveBeenCalledWith('visible');
  });

  it('setMemoryRecallVoiceState で状態テキストを設定する', () => {
    const el = createElement('memory-recall-voice-status');
    elements.set('memory-recall-voice-status', el);

    setMemoryRecallVoiceState(true, false);
    expect(el.textContent).toBe('gemie君が話しています...');
    expect(el.className).toContain('speaking');

    setMemoryRecallVoiceState(false, true);
    expect(el.textContent).toBe('聞いています...話しかけてね');
    expect(el.className).toContain('listening');

    setMemoryRecallVoiceState(false, false);
    expect(el.textContent).toBe('');
  });

  it('onMemoryRecallClick / onRecallCloseClick でハンドラを登録する', () => {
    const recallBtn = createElement('memory-recall-btn');
    const closeBtn = createElement('recall-close-btn');
    elements.set('memory-recall-btn', recallBtn);
    elements.set('recall-close-btn', closeBtn);

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    onMemoryRecallClick(handler1);
    expect(recallBtn.addEventListener).toHaveBeenCalledWith('click', handler1);

    onRecallCloseClick(handler2);
    expect(closeBtn.addEventListener).toHaveBeenCalledWith('click', handler2);
  });
});
