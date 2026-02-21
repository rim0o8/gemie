import type { GameState } from '../types';
import * as overlay from './domOverlay';
import { getUIPhaseModel } from './uiPhaseModel';

const TOTAL_QUESTS = 5;

export const updateUI = (state: GameState, previousState: GameState | null = null): void => {
  const phaseModel = getUIPhaseModel(state);

  if (phaseModel.showRequestPanel && state.currentRequest) {
    overlay.showRequestPanel(
      'ジェミー君の要望',
      state.currentRequest.prompt,
      state.currentRequest.category,
    );
  } else {
    overlay.hideRequestPanel();
  }

  overlay.setCaptureButtonEnabled(phaseModel.captureEnabled);

  if (phaseModel.showLoading) {
    overlay.showLoadingSpinner();
  } else {
    overlay.hideLoadingSpinner();
  }

  if (phaseModel.statusMessage) {
    overlay.setStatusMessage(phaseModel.statusMessage, phaseModel.statusTone);
  } else {
    overlay.clearStatusMessage();
  }

  if (phaseModel.showErrorBanner) {
    overlay.showErrorBanner('通信に失敗しました。再試行するかメニューに戻ってください。');
  } else {
    overlay.hideErrorBanner();
  }

  // Phase transition effects
  if (previousState) {
    // Success: validating -> reaction
    if (previousState.phase === 'validating' && state.phase === 'reaction') {
      overlay.triggerSuccessFlash();
    }
    // Failure: validating -> waiting_capture (judge failed)
    if (previousState.phase === 'validating' && state.phase === 'waiting_capture') {
      overlay.triggerFailureShake();
    }
  }

  // Progress dots
  const completedCount = state.requestHistory.filter((h) => h.passed).length;
  overlay.updateProgress(completedCount, TOTAL_QUESTS);
};

export const initUI = (options: {
  readonly onCapture: () => void;
  readonly onRetry: () => void;
  readonly onBackToMenu: () => void;
}): void => {
  overlay.onCaptureClick(options.onCapture);
  overlay.onRetryClick(options.onRetry);
  overlay.onBackToMenuClick(options.onBackToMenu);
};
