import { GoogleGenAI } from '@google/genai';
import { buildMemoryIllustrationPrompt } from '../character/gemieCharacter';
import type { MemoryIllustrationResult, MemoryIllustrationService, MemoryItem } from '../../types';

type GenerateContentDeps = {
  readonly generateWithImage: (
    prompt: string,
    imageBase64: string,
    mimeType: string,
  ) => Promise<{
    readonly imageParts: readonly ContentPart[];
    readonly textParts: readonly string[];
  }>;
};

type ContentPart = {
  readonly inlineData?: { readonly mimeType: string; readonly data: string };
  readonly text?: string;
};

const extractResult = (
  imageParts: readonly ContentPart[],
  textParts: readonly string[],
): MemoryIllustrationResult => {
  const imagePart = imageParts.find((p) => p.inlineData);
  if (!imagePart?.inlineData) {
    throw new Error('Image generation failed: no image returned');
  }
  return {
    imageDataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    caption: textParts.join(' ').trim() || 'gemie君との思い出',
  };
};

export const createMemoryIllustrationServiceFromDeps = (
  deps: GenerateContentDeps,
): MemoryIllustrationService => ({
  generate: async (
    memory: MemoryItem,
    memoryImageBase64: string,
  ): Promise<MemoryIllustrationResult> => {
    const prompt = buildMemoryIllustrationPrompt(memory.summary, memory.emotionTag);
    const { imageParts, textParts } = await deps.generateWithImage(
      prompt,
      memoryImageBase64,
      'image/jpeg',
    );
    return extractResult(imageParts, textParts);
  },
});

export const createMemoryIllustrationService = (
  apiKey: string,
  model: string = 'gemini-3-pro-image-preview',
): MemoryIllustrationService => {
  const ai = new GoogleGenAI({ apiKey });

  return createMemoryIllustrationServiceFromDeps({
    generateWithImage: async (prompt, imageBase64, mimeType) => {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }],
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imageParts: ContentPart[] = [];
      const textParts: string[] = [];

      for (const part of parts) {
        if (part.inlineData) {
          imageParts.push({
            inlineData: {
              mimeType: part.inlineData.mimeType ?? 'image/png',
              data: part.inlineData.data ?? '',
            },
          });
        }
        if (part.text) {
          textParts.push(part.text);
        }
      }

      return { imageParts, textParts };
    },
  });
};
