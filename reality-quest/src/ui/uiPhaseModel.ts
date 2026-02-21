import type { GameState, UIPhaseModel as BaseUIPhaseModel } from '../types';

export type UIStatusTone = 'normal' | 'success' | 'error';

export type UIPhaseModel = BaseUIPhaseModel & {
  readonly statusTone: UIStatusTone;
};

export const getUIPhaseModel = (state: GameState): UIPhaseModel => {
  const hasActiveRequest = state.currentRequest !== null;

  if (state.phase === 'menu') {
    return {
      showRequestPanel: false,
      captureEnabled: false,
      showLoading: false,
      statusMessage: null,
      statusTone: 'normal',
      showErrorBanner: false,
    };
  }

  if (state.phase === 'listening') {
    return {
      showRequestPanel: false,
      captureEnabled: false,
      showLoading: true,
      statusMessage: '接続中...',
      statusTone: 'normal',
      showErrorBanner: false,
    };
  }

  if (state.phase === 'requesting') {
    return {
      showRequestPanel: hasActiveRequest,
      captureEnabled: false,
      showLoading: false,
      statusMessage: 'ジェミー君がお話し中...',
      statusTone: 'normal',
      showErrorBanner: false,
    };
  }

  if (state.phase === 'waiting_capture') {
    return {
      showRequestPanel: hasActiveRequest,
      captureEnabled: true,
      showLoading: false,
      statusMessage: null,
      statusTone: 'normal',
      showErrorBanner: false,
    };
  }

  if (state.phase === 'validating') {
    return {
      showRequestPanel: hasActiveRequest,
      captureEnabled: false,
      showLoading: true,
      statusMessage: '確認中...',
      statusTone: 'normal',
      showErrorBanner: false,
    };
  }

  if (state.phase === 'reaction') {
    return {
      showRequestPanel: hasActiveRequest,
      captureEnabled: false,
      showLoading: false,
      statusMessage: 'ジェミー君が喜んでいます！',
      statusTone: 'success',
      showErrorBanner: false,
    };
  }

  return {
    showRequestPanel: false,
    captureEnabled: false,
    showLoading: false,
    statusMessage: null,
    statusTone: 'error',
    showErrorBanner: true,
  };
};
