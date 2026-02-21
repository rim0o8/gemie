import { applyJudgeResult, createInitialState } from '../domain/character/jemieAgent';
import type { CollectedGemie, GameEvent, GamePhase, GameState } from '../types';

const withTimestamp = (state: GameState, occurredAt: string): GameState => ({
  ...state,
  updatedAt: occurredAt,
});

export const transition = (state: GameState, event: GameEvent): GameState => {
  if (event.type === 'MEMORY_SAVED') {
    const merged = [...state.memories.filter((item) => item.id !== event.memory.id), event.memory];
    return { ...state, memories: merged, updatedAt: event.occurredAt };
  }

  if (event.type === 'MEMORY_LIST_LOADED') {
    return { ...state, memories: [...event.memories], updatedAt: event.occurredAt };
  }

  if (event.type === 'VOICE_STATE_UPDATED') {
    return { ...state, conversation: event.conversation, updatedAt: event.occurredAt };
  }

  switch (state.phase) {
    case 'menu':
      if (event.type === 'START_AR')
        return { ...state, phase: 'listening', updatedAt: event.occurredAt };
      if (event.type === 'RESET') return createInitialState(event.occurredAt);
      return state;

    case 'listening':
      if (event.type === 'REQUEST_READY') {
        return {
          ...state,
          phase: 'requesting',
          currentRequest: event.request,
          updatedAt: event.occurredAt,
        };
      }
      if (event.type === 'ERROR_OCCURRED')
        return { ...state, phase: 'error', updatedAt: event.occurredAt };
      if (event.type === 'RESET') return createInitialState(event.occurredAt);
      return state;

    case 'requesting':
      if (event.type === 'REQUEST_SPOKEN')
        return { ...state, phase: 'waiting_capture', updatedAt: event.occurredAt };
      if (event.type === 'REQUEST_READY')
        return { ...state, currentRequest: event.request, updatedAt: event.occurredAt };
      if (event.type === 'ERROR_OCCURRED')
        return { ...state, phase: 'error', updatedAt: event.occurredAt };
      if (event.type === 'RESET') return createInitialState(event.occurredAt);
      return state;

    case 'waiting_capture':
      if (event.type === 'CAPTURE_SUBMIT')
        return { ...state, phase: 'validating', updatedAt: event.occurredAt };
      if (event.type === 'ERROR_OCCURRED')
        return { ...state, phase: 'error', updatedAt: event.occurredAt };
      if (event.type === 'RESET') return createInitialState(event.occurredAt);
      return state;

    case 'validating':
      if (event.type === 'JUDGE_PASSED') {
        return {
          ...applyJudgeResult(state, event.result, event.occurredAt),
          phase: 'reaction',
        };
      }
      if (event.type === 'JUDGE_FAILED') {
        return {
          ...applyJudgeResult(state, event.result, event.occurredAt),
          phase: 'waiting_capture',
        };
      }
      if (event.type === 'ERROR_OCCURRED')
        return { ...state, phase: 'error', updatedAt: event.occurredAt };
      if (event.type === 'RESET') return createInitialState(event.occurredAt);
      return state;

    case 'reaction':
      if (event.type === 'REACTION_DONE') {
        const newGemie: CollectedGemie = {
          id: `gemie-${Date.now()}`,
          imageUrl: event.illustrationUrl,
          emotionTag: event.reaction.emotionTag,
          requestPrompt: state.currentRequest?.prompt ?? '',
          createdAt: event.occurredAt,
        };
        return {
          ...state,
          phase: 'requesting',
          currentRequest: null,
          lastIllustrationUrl: event.illustrationUrl,
          collectedGemies: [...state.collectedGemies, newGemie],
          updatedAt: event.occurredAt,
        };
      }
      if (event.type === 'ERROR_OCCURRED')
        return { ...state, phase: 'error', updatedAt: event.occurredAt };
      if (event.type === 'RESET') return createInitialState(event.occurredAt);
      return state;

    case 'error':
      if (event.type === 'RESET') return createInitialState(event.occurredAt);
      if (event.type === 'START_AR')
        return { ...state, phase: 'listening', updatedAt: event.occurredAt };
      return withTimestamp(state, event.occurredAt);
  }
};

export const isCapturePhase = (phase: GamePhase): boolean =>
  phase === 'waiting_capture' || phase === 'validating' || phase === 'reaction';
