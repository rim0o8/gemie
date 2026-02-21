import { GoogleGenAI } from '@google/genai';
import type { IllustrationService } from '../../types';

const fallbackIllustrationDataUrl = (prompt: string): string => {
  const escapedPrompt = prompt.replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 80);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="320" viewBox="0 0 512 320">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>
  </defs>
  <rect width="512" height="320" fill="url(#bg)"/>
  <circle cx="130" cy="160" r="72" fill="#f59e0b"/>
  <circle cx="108" cy="145" r="10" fill="#111827"/>
  <circle cx="152" cy="145" r="10" fill="#111827"/>
  <path d="M100 185 Q130 215 160 185" stroke="#111827" stroke-width="8" fill="none" stroke-linecap="round"/>
  <text x="230" y="120" fill="#e2e8f0" font-size="24" font-family="sans-serif">Jemie is happy</text>
  <text x="230" y="160" fill="#bfdbfe" font-size="16" font-family="sans-serif">${escapedPrompt}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const ILLUSTRATION_TIMEOUT_MS = 30000;

export const createGeminiIllustrationService = (
  apiKey: string,
  model: string = 'gemini-3-pro-image-preview',
): IllustrationService => {
  const ai = new GoogleGenAI({ apiKey });

  return {
    generate: async (prompt: string, imageBase64?: string): Promise<string> => {
      console.info('[GeminiIllustration] generating', {
        model,
        promptLength: prompt.length,
        hasImage: !!imageBase64,
      });

      try {
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
          [];

        if (imageBase64) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
        }
        parts.push({ text: prompt });

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
          new Promise<never>((_resolve, reject) =>
            setTimeout(
              () =>
                reject(new Error(`illustration generation timeout (${ILLUSTRATION_TIMEOUT_MS}ms)`)),
              ILLUSTRATION_TIMEOUT_MS,
            ),
          ),
        ]);

        const responseParts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of responseParts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType ?? 'image/png';
            const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            console.info('[GeminiIllustration] image generated', {
              mimeType,
              dataSize: part.inlineData.data.length,
            });
            return dataUrl;
          }
        }

        console.warn('[GeminiIllustration] no image in response, using fallback');
        return fallbackIllustrationDataUrl(prompt);
      } catch (error) {
        console.error('[GeminiIllustration] generation failed', error);
        return fallbackIllustrationDataUrl(prompt);
      }
    },
  };
};
