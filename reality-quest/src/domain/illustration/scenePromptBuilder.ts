import { GoogleGenAI } from '@google/genai';
import { GEMIE_CHARACTER_BIBLE } from '../character/gemieCharacter';

export type ScenePromptBuilder = {
  readonly build: (
    imageBase64: string,
    emotionTag: string,
    requestPrompt: string,
  ) => Promise<string>;
};

type ScenePromptBuilderDeps = {
  readonly describeImage: (imageBase64: string, instruction: string) => Promise<string>;
};

const SCENE_DESCRIBE_INSTRUCTION = [
  'Describe what is shown in this photo concisely in English for use as an image generation prompt.',
  'Include: objects, colors, arrangement, and atmosphere.',
  'Keep it to 2-3 sentences. Do not add any preamble or explanation.',
].join(' ');

export const createScenePromptBuilderFromDeps = (
  deps: ScenePromptBuilderDeps,
): ScenePromptBuilder => ({
  build: async (imageBase64, emotionTag, requestPrompt) => {
    let sceneDescription: string;
    try {
      sceneDescription = await deps.describeImage(imageBase64, SCENE_DESCRIBE_INSTRUCTION);
    } catch (error) {
      console.error('[ScenePromptBuilder] image description failed, using generic prompt', error);
      sceneDescription = 'a cozy indoor scene with everyday objects';
    }

    console.info('[ScenePromptBuilder] scene described', {
      emotionTag,
      scenePreview: sceneDescription.slice(0, 100),
    });

    return [
      GEMIE_CHARACTER_BIBLE,
      `Scene from the user's camera: ${sceneDescription}`,
      `Gemie's emotion: ${emotionTag}. Gemie is reacting to what the user showed.`,
      `Context: The user showed this in response to Gemie's request: "${requestPrompt}"`,
      'Composition: Place Gemie in the foreground, naturally interacting with the scene.',
      'If food or drinks are shown, Gemie looks excited and reaches toward them with sparkling eyes.',
      'If objects are shown, Gemie curiously examines them with a tilted head.',
      'If scenery is shown, Gemie admires the view from a cute vantage point.',
      'Style: cute 2D illustration, warm colors, playful atmosphere, no text overlays.',
    ].join(' ');
  },
});

export const createGeminiScenePromptBuilder = (
  apiKey: string,
  model: string = 'gemini-2.5-flash',
): ScenePromptBuilder => {
  const ai = new GoogleGenAI({ apiKey });

  return createScenePromptBuilderFromDeps({
    describeImage: async (imageBase64, instruction) => {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
              { text: instruction },
            ],
          },
        ],
      });
      return response.text ?? '';
    },
  });
};
