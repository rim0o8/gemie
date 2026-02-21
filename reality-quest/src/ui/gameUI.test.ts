import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../domain/character/jemieAgent';
import type { GameState } from '../types';

const overlay = vi.hoisted(() => ({
  showRequestPanel: vi.fn(),
  hideRequestPanel: vi.fn(),
  setCaptureButtonEnabled: vi.fn(),
  showLoadingSpinner: vi.fn(),
  hideLoadingSpinner: vi.fn(),
  setStatusMessage: vi.fn(),
  clearStatusMessage: vi.fn(),
  showErrorBanner: vi.fn(),
  hideErrorBanner: vi.fn(),
  onCaptureClick: vi.fn(),
  onRetryClick: vi.fn(),
  onBackToMenuClick: vi.fn(),
  triggerSuccessFlash: vi.fn(),
  triggerFailureShake: vi.fn(),
  updateProgress: vi.fn(),
}));

vi.mock('./domOverlay', () => overlay);

const { initUI, updateUI } = await import('./gameUI');

const now = '2026-02-21T00:00:00.000Z';

describe('updateUI', () => {
  beforeEach(() => {
    Object.values(overlay).forEach((fn) => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as unknown as { mockReset: () => void }).mockReset();
      }
    });
  });

  it('waiting_capture で capture を有効化し request panel を表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'waiting_capture',
      currentRequest: {
        id: 'req-1',
        category: 'food',
        prompt: '赤い食べ物を見せて',
        acceptanceCriteria: '赤い食べ物',
        hintPrompt: 'りんごを探して',
      },
    };

    updateUI(state, createInitialState(now));

    expect(overlay.showRequestPanel).toHaveBeenCalledWith(
      'ジェミー君の要望',
      '赤い食べ物を見せて',
      'food',
    );
    expect(overlay.setCaptureButtonEnabled).toHaveBeenCalledWith(true);
    expect(overlay.hideErrorBanner).toHaveBeenCalled();
  });

  it('error でエラーバナーを表示', () => {
    const state: GameState = {
      ...createInitialState(now),
      phase: 'error',
      currentRequest: {
        id: 'req-1',
        category: 'food',
        prompt: '赤い食べ物を見せて',
        acceptanceCriteria: '赤い食べ物',
        hintPrompt: 'りんごを探して',
      },
    };

    updateUI(state, createInitialState(now));

    expect(overlay.showErrorBanner).toHaveBeenCalled();
    expect(overlay.setCaptureButtonEnabled).toHaveBeenCalledWith(false);
  });
});

describe('initUI', () => {
  it('各ハンドラを登録する', () => {
    const onCapture = vi.fn();
    const onRetry = vi.fn();
    const onBackToMenu = vi.fn();

    initUI({ onCapture, onRetry, onBackToMenu });

    expect(overlay.onCaptureClick).toHaveBeenCalledWith(onCapture);
    expect(overlay.onRetryClick).toHaveBeenCalledWith(onRetry);
    expect(overlay.onBackToMenuClick).toHaveBeenCalledWith(onBackToMenu);
  });
});
