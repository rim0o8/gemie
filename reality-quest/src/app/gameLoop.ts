import type * as THREE from 'three';
import { transition } from '../engine/gameEngine';
import { createLiveNarrator } from '../domain/narrator/liveNarrator';
import { createGemieVoiceChat } from '../domain/voiceChat/gemieVoiceChat';
import { startCamera } from '../camera/captureFrame';
import { playAREffect } from '../ar/arEffects';
import { updateUI } from '../ui/gameUI';
import { flashCaptureButton, setGemieAvatarImage, showGemieAvatar } from '../ui/domOverlay';
import type { CameraCapture } from '../camera/captureFrame';
import type { IOSARSession } from '../ar/iosCameraAR';
import type { ConversationState, GameEvent, GameState, JudgeResult, Narrator } from '../types';
import type { GemieVoiceChat } from '../domain/voiceChat/gemieVoiceChat';
import type { ServiceContainer, RuntimeConfig } from './bootstrap';

const now = (): string => new Date().toISOString();

export type GameRuntime = {
  readonly dispatch: (event: GameEvent) => void;
  readonly handleCapture: () => Promise<void>;
  readonly prepareNextRequest: () => Promise<void>;
  readonly startGame: () => Promise<void>;
  readonly stopGame: () => void;
  readonly moveToMenu: () => void;
  readonly retryFromError: () => void;
  readonly backToMenu: () => void;
  readonly startNarratorAndCamera: (audioCtx?: AudioContext) => Promise<void>;
  readonly initializeConversationStack: (
    capture: CameraCapture,
    audioCtx?: AudioContext,
  ) => Promise<void>;
  readonly teardownRuntimeResources: () => void;
  readonly getState: () => GameState;
  readonly setIosSession: (session: IOSARSession | null) => void;
  readonly getIosSession: () => IOSARSession | null;
  readonly setMenuVisible: (visible: boolean) => void;
};

export const createGameRuntime = (
  services: ServiceContainer,
  scene: THREE.Scene,
  hitPositionRef: THREE.Vector3,
): GameRuntime => {
  const {
    judge,
    requestGenerator,
    reactionRenderer,
    illustrationService,
    scenePromptBuilder,
    memoryApi,
    stateStore,
    gemieAvatarAgent,
    locationService,
  } = services;
  const config: RuntimeConfig = services.config;

  let gameState: GameState = stateStore.load(now());
  let narrator: Narrator | null = null;
  let voiceChat: GemieVoiceChat | null = null;
  let cameraCapture: CameraCapture | null = null;
  let iosSession: IOSARSession | null = null;
  let retryAction: null | (() => Promise<void>) = null;
  let recoverState: GameState | null = null;

  const setMenuVisible = (visible: boolean): void => {
    document
      .getElementById('menu-screen')
      ?.setAttribute('style', visible ? 'display:flex' : 'display:none');
    document
      .getElementById('ar-overlay')
      ?.setAttribute('style', visible ? 'display:none' : 'display:grid');
  };

  const dispatch = (event: GameEvent): void => {
    const previousState = gameState;
    gameState = transition(gameState, event);
    stateStore.save(gameState);
    updateUI(gameState, previousState);
  };

  const moveToMenu = (): void => {
    setMenuVisible(true);
    gameState = {
      ...gameState,
      phase: 'menu',
      currentRequest: null,
      updatedAt: now(),
    };
    stateStore.save(gameState);
    updateUI(gameState, gameState);
  };

  const handleFlowError = (reason: string, error: unknown): void => {
    console.error('[MainFlow]', reason, error);
    recoverState = { ...gameState };
    dispatch({ type: 'ERROR_OCCURRED', reason, occurredAt: now() });
  };

  const updateConversationState = (patch: Partial<ConversationState>): void => {
    dispatch({
      type: 'VOICE_STATE_UPDATED',
      conversation: { ...gameState.conversation, ...patch },
      occurredAt: now(),
    });
  };

  const speakIfAvailable = async (text: string): Promise<void> => {
    if (!narrator) return;
    updateConversationState({ isSpeaking: true, lastError: null });
    try {
      await narrator.speak(text);
    } catch (error) {
      console.error('[Narrator] speak failed, continuing game flow', error);
      updateConversationState({ lastError: `narrator speak failed: ${String(error)}` });
    } finally {
      updateConversationState({ isSpeaking: false });
    }
  };

  const loadMemories = async (): Promise<void> => {
    try {
      const memories = await memoryApi.listMemories();
      dispatch({ type: 'MEMORY_LIST_LOADED', memories, occurredAt: now() });
    } catch (error) {
      console.error('[Memories] list failed', error);
    }
  };

  const prepareNextRequest = async (): Promise<void> => {
    retryAction = prepareNextRequest;
    if (gameState.phase !== 'listening' && gameState.phase !== 'requesting') {
      console.warn('[GameLoop] prepareNextRequest skipped, phase =', gameState.phase);
      return;
    }

    if (locationService.isAvailable()) {
      try {
        const location = await locationService.getCurrentPosition();
        gameState = { ...gameState, location };
        console.info('[GameLoop] location acquired', {
          lat: location.latitude.toFixed(4),
          lng: location.longitude.toFixed(4),
          accuracy: `${Math.round(location.accuracy)}m`,
          address: location.address ?? '(reverse geocode unavailable)',
        });
      } catch (error) {
        console.warn('[GameLoop] location unavailable — gemie will respond without location context', error);
      }
    } else {
      console.warn('[GameLoop] geolocation API not available — gemie will respond without location context');
    }

    try {
      console.info('[GameLoop] generating request...');
      const request = await requestGenerator.generate(gameState);
      console.info('[GameLoop] request ready:', request.id);
      dispatch({ type: 'REQUEST_READY', request, occurredAt: now() });
      console.info('[GameLoop] speaking request prompt...');
      await speakIfAvailable(request.prompt);
      console.info('[GameLoop] speak done, transitioning to waiting_capture');
      dispatch({ type: 'REQUEST_SPOKEN', occurredAt: now() });
    } catch (error) {
      handleFlowError('request generation failed', error);
    }
  };

  const handleCapture = async (): Promise<void> => {
    retryAction = handleCapture;
    if (gameState.phase !== 'waiting_capture' || !cameraCapture || !gameState.currentRequest)
      return;
    const currentRequest = gameState.currentRequest;

    let imageBase64 = '';
    try {
      imageBase64 = cameraCapture.getBase64Frame();
    } catch (error) {
      handleFlowError('capture failed', error);
      return;
    }

    dispatch({ type: 'CAPTURE_SUBMIT', imageBase64, occurredAt: now() });
    flashCaptureButton();

    let result: JudgeResult;
    try {
      result = await judge.evaluate(imageBase64, currentRequest);
    } catch (error) {
      handleFlowError('judge failed', error);
      return;
    }

    if (!result.passed) {
      dispatch({ type: 'JUDGE_FAILED', result, occurredAt: now() });
      try {
        await speakIfAvailable(currentRequest.hintPrompt);
      } catch (error) {
        console.error('[HintSpeak]', error);
      }
      return;
    }

    dispatch({ type: 'JUDGE_PASSED', result, occurredAt: now() });

    try {
      await playAREffect(scene, hitPositionRef, 'seal-break');
    } catch (error) {
      console.error('[AREffect]', error);
    }

    try {
      const requestPrompt = currentRequest.prompt;
      const reaction = await reactionRenderer.render(requestPrompt, result);

      // Generate scene-aware text prompt from the captured image, then generate a new Gemie illustration
      const scenePrompt = await scenePromptBuilder.build(
        imageBase64,
        reaction.emotionTag,
        requestPrompt,
      );
      console.info('[GameLoop] illustration prompt generated', {
        promptPreview: scenePrompt.slice(0, 120),
      });
      // Pass only the text prompt — the scene is already described by scenePromptBuilder.
      // Passing the raw photo would cause the model to echo it back instead of generating a new illustration.
      const illustrationUrl = await illustrationService.generate(scenePrompt);
      setGemieAvatarImage(illustrationUrl);
      await speakIfAvailable(reaction.voiceText);
      dispatch({
        type: 'REACTION_DONE',
        reaction,
        illustrationUrl,
        occurredAt: now(),
      });
      try {
        const memory = await memoryApi.saveMemory({
          imageBase64,
          sourceRequestId: currentRequest.id,
          judgeReason: result.reason,
          matchedObjects: [...result.matchedObjects],
          capturedAt: now(),
        });
        dispatch({ type: 'MEMORY_SAVED', memory, occurredAt: now() });
      } catch (error) {
        console.error('[Memories] save failed', error);
      }
      await prepareNextRequest();
    } catch (error) {
      handleFlowError('reaction failed', error);
    }
  };

  const updateGemieAvatar = async (transcript: string): Promise<void> => {
    try {
      const imageBase64 = cameraCapture?.getBase64Frame();
      const decision = await gemieAvatarAgent.judge(transcript, imageBase64);
      if (decision.shouldGenerate && decision.prompt) {
        const avatarUrl = await gemieAvatarAgent.generateAvatar(decision.prompt, imageBase64);
        setGemieAvatarImage(avatarUrl);
      }
    } catch (error) {
      console.error('[GemieAvatar] update failed', error);
    }
  };

  const initializeConversationStack = async (
    capture: CameraCapture,
    audioCtx?: AudioContext,
  ): Promise<void> => {
    cameraCapture = capture;
    narrator = await createLiveNarrator(config.apiKey, config.liveModel, audioCtx);
    voiceChat = createGemieVoiceChat({
      narrator,
      getMemories: () => gameState.memories,
      getLocation: () => gameState.location,
      onStateChange: (conversation) => {
        dispatch({ type: 'VOICE_STATE_UPDATED', conversation, occurredAt: now() });
      },
      onUserSpoke: (transcript) => {
        void updateGemieAvatar(transcript);
      },
    });
    updateConversationState({ isLiveConnected: true, isListening: false, lastError: null });
  };

  const startNarratorAndCamera = async (audioCtx?: AudioContext): Promise<void> => {
    const capture = await startCamera();
    await initializeConversationStack(capture, audioCtx);
  };

  const startGame = async (): Promise<void> => {
    retryAction = startGame;
    dispatch({ type: 'START_AR', occurredAt: now() });
    showGemieAvatar();
    try {
      voiceChat?.start();
    } catch (error) {
      console.error('[GameLoop] voiceChat.start failed, continuing', error);
    }

    // Memory loading is non-blocking — failures should not prevent the game from starting
    void loadMemories().catch((error: unknown) => {
      console.error('[Memories] background load failed', error);
    });

    await prepareNextRequest();
  };

  const teardownRuntimeResources = (): void => {
    voiceChat?.stop();
    narrator?.close();
    cameraCapture?.stop();
    iosSession?.stop();
    iosSession = null;
    cameraCapture = null;
    voiceChat = null;
    narrator = null;
  };

  const stopGame = (): void => {
    teardownRuntimeResources();
    updateConversationState({ isLiveConnected: false, isListening: false, isSpeaking: false });
    moveToMenu();
  };

  const retryFromError = (): void => {
    if (gameState.phase !== 'error' || !recoverState) return;
    const restored = { ...recoverState, updatedAt: now() };
    const previous = gameState;
    gameState = restored;
    stateStore.save(gameState);
    updateUI(gameState, previous);
    recoverState = null;
    if (retryAction) {
      void retryAction().catch((error: unknown) => {
        handleFlowError('retry failed', error);
      });
    }
  };

  const backToMenu = (): void => {
    stopGame();
    setMenuVisible(true);
  };

  return {
    dispatch,
    handleCapture,
    prepareNextRequest,
    startGame,
    stopGame,
    moveToMenu,
    retryFromError,
    backToMenu,
    startNarratorAndCamera,
    initializeConversationStack,
    teardownRuntimeResources,
    getState: () => gameState,
    setIosSession: (session) => {
      iosSession = session;
    },
    getIosSession: () => iosSession,
    setMenuVisible,
  };
};
