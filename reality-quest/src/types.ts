export type GamePhase =
  | 'menu'
  | 'listening'
  | 'requesting'
  | 'waiting_capture'
  | 'validating'
  | 'reaction'
  | 'error';

export type GeoLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;
  readonly timestamp: string;
  readonly address: string | null;
};

export type LocationService = {
  readonly getCurrentPosition: () => Promise<GeoLocation>;
  readonly isAvailable: () => boolean;
};

export type JemieRequestCategory = 'food' | 'scenery' | 'object' | 'spot';

export type JemieRequest = {
  readonly id: string;
  readonly category: JemieRequestCategory;
  readonly prompt: string;
  readonly acceptanceCriteria: string;
  readonly hintPrompt: string;
};

export type JudgeSafety = 'safe' | 'unsafe' | 'unknown';

export type JudgeResult = {
  readonly passed: boolean;
  readonly reason: string;
  readonly confidence: number;
  readonly matchedObjects: readonly string[];
  readonly safety: JudgeSafety;
};

export type RequestHistoryItem = {
  readonly requestId: string;
  readonly passed: boolean;
  readonly confidence: number;
  readonly reason: string;
  readonly timestamp: string;
};

export type ReactionResult = {
  readonly voiceText: string;
  readonly illustrationPrompt: string;
  readonly emotionTag: string;
};

export type MemoryItem = {
  readonly id: string;
  readonly imageUrl: string;
  readonly summary: string;
  readonly createdAt: string;
  readonly sourceRequestId: string;
  readonly emotionTag: string | null;
};

export type CollectedGemie = {
  readonly id: string;
  readonly imageUrl: string;
  readonly emotionTag: string;
  readonly requestPrompt: string;
  readonly createdAt: string;
};

export type ConversationState = {
  readonly isLiveConnected: boolean;
  readonly isListening: boolean;
  readonly isSpeaking: boolean;
  readonly lastTranscript: string | null;
  readonly lastError: string | null;
};

export type GameState = {
  readonly phase: GamePhase;
  readonly currentRequest: JemieRequest | null;
  readonly lastJudge: JudgeResult | null;
  readonly lastIllustrationUrl: string | null;
  readonly requestHistory: readonly RequestHistoryItem[];
  readonly memories: readonly MemoryItem[];
  readonly collectedGemies: readonly CollectedGemie[];
  readonly conversation: ConversationState;
  readonly location: GeoLocation | null;
  readonly updatedAt: string;
};

export type GameEvent =
  | { readonly type: 'START_AR'; readonly occurredAt: string }
  | { readonly type: 'REQUEST_READY'; readonly request: JemieRequest; readonly occurredAt: string }
  | { readonly type: 'REQUEST_SPOKEN'; readonly occurredAt: string }
  | { readonly type: 'CAPTURE_SUBMIT'; readonly imageBase64: string; readonly occurredAt: string }
  | { readonly type: 'JUDGE_PASSED'; readonly result: JudgeResult; readonly occurredAt: string }
  | { readonly type: 'JUDGE_FAILED'; readonly result: JudgeResult; readonly occurredAt: string }
  | {
      readonly type: 'REACTION_DONE';
      readonly reaction: ReactionResult;
      readonly illustrationUrl: string;
      readonly occurredAt: string;
    }
  | { readonly type: 'MEMORY_SAVED'; readonly memory: MemoryItem; readonly occurredAt: string }
  | {
      readonly type: 'MEMORY_LIST_LOADED';
      readonly memories: readonly MemoryItem[];
      readonly occurredAt: string;
    }
  | {
      readonly type: 'VOICE_STATE_UPDATED';
      readonly conversation: ConversationState;
      readonly occurredAt: string;
    }
  | { readonly type: 'ERROR_OCCURRED'; readonly reason: string; readonly occurredAt: string }
  | { readonly type: 'RESET'; readonly occurredAt: string };

export type Narrator = {
  readonly speak: (prompt: string) => Promise<void>;
  readonly close: () => void;
};

export type Judge = {
  readonly evaluate: (imageBase64: string, request: JemieRequest) => Promise<JudgeResult>;
};

export type RequestGenerator = {
  readonly generate: (state: GameState) => Promise<JemieRequest>;
};

export type ReactionRenderer = {
  readonly render: (requestPrompt: string, judge: JudgeResult) => Promise<ReactionResult>;
};

export type IllustrationService = {
  readonly generate: (prompt: string, imageBase64?: string) => Promise<string>;
};

export type MemoryIllustrationResult = {
  readonly imageDataUrl: string;
  readonly caption: string;
};

export type MemoryIllustrationService = {
  readonly generate: (
    memory: MemoryItem,
    memoryImageBase64: string,
  ) => Promise<MemoryIllustrationResult>;
};

export type UIPhaseModel = {
  readonly captureEnabled: boolean;
  readonly showRequestPanel: boolean;
  readonly showLoading: boolean;
  readonly showErrorBanner: boolean;
  readonly statusMessage: string | null;
};

export type AvatarDecision = {
  readonly shouldGenerate: boolean;
  readonly prompt: string | null;
};

export type GemieAvatarAgent = {
  readonly judge: (transcript: string, imageBase64?: string) => Promise<AvatarDecision>;
  readonly generateAvatar: (prompt: string, imageBase64?: string) => Promise<string>;
};

export type AREffectType = 'seal-break' | 'portal-open' | 'final-gate';
