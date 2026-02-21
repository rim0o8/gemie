import { initUI } from '../ui/gameUI';
import * as overlay from '../ui/domOverlay';
import { createLiveNarrator } from '../domain/narrator/liveNarrator';
import { createGemieVoiceChat } from '../domain/voiceChat/gemieVoiceChat';
import type { MemoryItem, Narrator } from '../types';
import type { GemieVoiceChat } from '../domain/voiceChat/gemieVoiceChat';
import type { GameRuntime } from './gameLoop';
import type { ServiceContainer } from './bootstrap';

export const wireUI = (runtime: GameRuntime): void => {
  initUI({
    onCapture: () => {
      void runtime.handleCapture();
    },
    onRetry: () => {
      runtime.retryFromError();
    },
    onBackToMenu: () => {
      runtime.backToMenu();
    },
  });
};

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error('Failed to convert image to base64'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
};

export const wireMemoryRecall = (runtime: GameRuntime, services: ServiceContainer): void => {
  const { memoryApi, memoryIllustrationService, config } = services;
  let recallNarrator: Narrator | null = null;
  let recallVoiceChat: GemieVoiceChat | null = null;

  const teardownRecall = (): void => {
    recallVoiceChat?.stop();
    recallNarrator?.close();
    recallVoiceChat = null;
    recallNarrator = null;
  };

  const generateMemoryIllustration = (memory: MemoryItem): void => {
    overlay.setMemoryRecallLoading(true);
    overlay.setMemoryRecallImage(memory.imageUrl);
    overlay.setMemoryRecallCaption(memory.summary);

    void fetchImageAsBase64(memory.imageUrl)
      .then((base64) => memoryIllustrationService.generate(memory, base64))
      .then((result) => {
        overlay.setMemoryRecallImage(result.imageDataUrl);
        overlay.setMemoryRecallCaption(result.caption);
      })
      .catch((error: unknown) => {
        console.error('[MemoryRecall] illustration generation failed', error);
        // Keep the original memory image on failure
      })
      .finally(() => {
        overlay.setMemoryRecallLoading(false);
      });
  };

  overlay.onMemoryRecallClick(() => {
    // Create AudioContext synchronously in click handler to avoid mobile suspension
    const audioCtx = new AudioContext();

    overlay.setMemoryRecallCaption('gemie君を起こしています...');
    overlay.setMemoryRecallImage('');
    overlay.setMemoryRecallLoading(true);
    overlay.showMemoryRecallOverlay();

    void (async () => {
      try {
        // Load memories first
        const memories = await memoryApi.listMemories();
        runtime.dispatch({
          type: 'MEMORY_LIST_LOADED',
          memories,
          occurredAt: new Date().toISOString(),
        });

        // Create narrator for voice (no camera needed)
        recallNarrator = await createLiveNarrator(config.apiKey, config.liveModel, audioCtx);

        // Create voice chat with memory illustration callback
        recallVoiceChat = createGemieVoiceChat({
          narrator: recallNarrator,
          getMemories: () => runtime.getState().memories,
          getLocation: () => runtime.getState().location,
          onStateChange: (voiceState) => {
            overlay.setMemoryRecallVoiceState(voiceState.isSpeaking, voiceState.isListening);
          },
          onMemoryDiscussed: (memory) => {
            generateMemoryIllustration(memory);
          },
        });

        overlay.setMemoryRecallLoading(false);

        // Start the recall session - gemie picks a memory, speaks, and listens
        await recallVoiceChat.startRecallSession();
      } catch (error) {
        console.error('[MemoryRecall] session start failed', error);
        overlay.setMemoryRecallLoading(false);
        overlay.setMemoryRecallCaption('接続に失敗しました。もう一度お試しください。');
      }
    })();
  });

  overlay.onRecallCloseClick(() => {
    teardownRecall();
    overlay.hideMemoryRecallOverlay();
  });
};

export const wireGemieCollection = (runtime: GameRuntime): void => {
  overlay.onGemieCollectionClick(() => {
    const state = runtime.getState();
    overlay.renderGemieCollection(state.collectedGemies, (gemie) => {
      overlay.showGemieDetail(gemie);
    });
    overlay.showGemieCollection();
  });

  overlay.onCollectionCloseClick(() => {
    overlay.hideGemieCollection();
  });

  overlay.onGemieDetailCloseClick(() => {
    overlay.hideGemieDetail();
  });
};
