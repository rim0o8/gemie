import { parseRuntimeConfig } from '../config';
import { createGeminiJudge } from '../domain/judge/geminiJudge';
import { createGeminiReactionRenderer } from '../domain/reaction/reactionRenderer';
import { createGeminiRequestGenerator } from '../domain/request/requestGenerator';
import { createGeminiIllustrationService } from '../domain/illustration/illustrationService';
import { createGeminiScenePromptBuilder } from '../domain/illustration/scenePromptBuilder';
import { createMemoryIllustrationService } from '../domain/illustration/memoryIllustrationService';
import { createMemoryApiClient } from '../domain/memory/memoryApiClient';
import { createGemieAvatarAgent } from '../domain/character/gemieAvatarAgent';
import { createBrowserLocationService } from '../domain/location/locationService';
import { createStateStore } from '../engine/stateStore';
import type {
  Judge,
  RequestGenerator,
  ReactionRenderer,
  IllustrationService,
  MemoryIllustrationService,
  GemieAvatarAgent,
  LocationService,
} from '../types';
import type { ScenePromptBuilder } from '../domain/illustration/scenePromptBuilder';
import type { MemoryApiClient } from '../domain/memory/memoryApiClient';
import type { StateStore } from '../engine/stateStore';

export type RuntimeConfig = ReturnType<typeof parseRuntimeConfig>;

export type ServiceContainer = {
  readonly config: RuntimeConfig;
  readonly judge: Judge;
  readonly requestGenerator: RequestGenerator;
  readonly reactionRenderer: ReactionRenderer;
  readonly illustrationService: IllustrationService;
  readonly scenePromptBuilder: ScenePromptBuilder;
  readonly memoryIllustrationService: MemoryIllustrationService;
  readonly memoryApi: MemoryApiClient;
  readonly stateStore: StateStore;
  readonly gemieAvatarAgent: GemieAvatarAgent;
  readonly locationService: LocationService;
};

export const createServices = (env: Record<string, string>): ServiceContainer => {
  const config = parseRuntimeConfig(env);
  return {
    config,
    judge: createGeminiJudge(config.apiKey, config.textModel),
    requestGenerator: createGeminiRequestGenerator(config.apiKey, config.textModel),
    reactionRenderer: createGeminiReactionRenderer(config.apiKey, config.textModel),
    illustrationService: createGeminiIllustrationService(config.apiKey, config.imageModel),
    scenePromptBuilder: createGeminiScenePromptBuilder(config.apiKey, config.textModel),
    memoryIllustrationService: createMemoryIllustrationService(config.apiKey, config.imageModel),
    memoryApi: createMemoryApiClient({ baseUrl: config.apiBaseUrl }),
    stateStore: createStateStore({ storage: localStorage, storageKey: 'jemie-state-v1' }),
    gemieAvatarAgent: createGemieAvatarAgent(config.apiKey, config.textModel, config.imageModel),
    locationService: createBrowserLocationService(),
  };
};
