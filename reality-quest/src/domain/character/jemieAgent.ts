import type { GameState, JudgeResult, RequestHistoryItem } from '../../types';

const buildHistoryItem = (
  state: GameState,
  result: JudgeResult,
  occurredAt: string,
): RequestHistoryItem | null => {
  if (!state.currentRequest) {
    return null;
  }
  return {
    requestId: state.currentRequest.id,
    passed: result.passed,
    confidence: result.confidence,
    reason: result.reason,
    timestamp: occurredAt,
  };
};

const appendHistory = (
  state: GameState,
  item: RequestHistoryItem | null,
): readonly RequestHistoryItem[] => {
  if (!item) {
    return state.requestHistory;
  }
  return [...state.requestHistory, item].slice(-20);
};

const DEFAULT_GEMIE = {
  id: 'gemie-default',
  imageUrl: '/gemie.png',
  emotionTag: 'neutral',
  requestPrompt: 'はじめまして！ジェミーだよ',
  createdAt: '',
} as const;

export const createInitialState = (now: string = new Date().toISOString()): GameState => ({
  phase: 'menu',
  currentRequest: null,
  lastJudge: null,
  lastIllustrationUrl: null,
  requestHistory: [],
  memories: [],
  collectedGemies: [{ ...DEFAULT_GEMIE, createdAt: now }],
  conversation: {
    isLiveConnected: false,
    isListening: false,
    isSpeaking: false,
    lastTranscript: null,
    lastError: null,
  },
  location: null,
  updatedAt: now,
});

export const applyJudgeResult = (
  state: GameState,
  result: JudgeResult,
  occurredAt: string,
): GameState => ({
  ...state,
  lastJudge: result,
  requestHistory: appendHistory(state, buildHistoryItem(state, result, occurredAt)),
  updatedAt: occurredAt,
});
