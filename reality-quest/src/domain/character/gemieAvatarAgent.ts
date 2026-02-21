import { GoogleGenAI } from '@google/genai';
import { GEMIE_CHARACTER_BIBLE } from './gemieCharacter';
import type { GemieAvatarAgent, AvatarDecision } from '../../types';

const JUDGE_SYSTEM_PROMPT = [
  'あなたはAR育成ゲームのキャラクター「gemie」のアバター画像を制御するエージェントです。',
  'ユーザーの発話内容を分析して、gemieの見た目画像を更新すべきかどうか判断してください。',
  '',
  '画像を生成すべきケース:',
  '- ユーザーが何か具体的なものを見せている（食べ物、景色、物体など）',
  '- ユーザーが強い感情を示している（驚き、喜び、悲しみなど）',
  '- ユーザーが場所や状況について話している',
  '- ユーザーがgemieの見た目に言及している',
  '',
  '画像を生成しないケース:',
  '- 単純な挨拶（こんにちは、おはよう等）',
  '- はい/いいえなどの短い応答',
  '- 質問だけの発話',
  '- 前回の発話とほぼ同じ内容',
  '',
  'JSONで回答してください:',
  '{"shouldGenerate": boolean, "prompt": string | null}',
  'promptは英語で、gemieの画像生成に使うプロンプトの「状況・感情」部分だけを記述してください。',
  'shouldGenerate=falseの場合、promptはnullにしてください。',
].join('\n');

const AVATAR_GENERATION_TIMEOUT_MS = 20000;

export const createGemieAvatarAgent = (
  apiKey: string,
  textModel: string,
  imageModel: string,
): GemieAvatarAgent => {
  const ai = new GoogleGenAI({ apiKey });

  const judge = async (transcript: string, imageBase64?: string): Promise<AvatarDecision> => {
    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];

      if (imageBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
        parts.push({
          text: `カメラに写っている映像も考慮してください。\n\nユーザーの発話: ${transcript}`,
        });
      } else {
        parts.push({ text: `ユーザーの発話: ${transcript}` });
      }

      const response = await ai.models.generateContent({
        model: textModel,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: JUDGE_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text ?? '';
      const parsed = JSON.parse(text) as { shouldGenerate?: boolean; prompt?: string | null };
      return {
        shouldGenerate: parsed.shouldGenerate === true,
        prompt: parsed.shouldGenerate ? (parsed.prompt ?? null) : null,
      };
    } catch (error) {
      console.error('[GemieAvatarAgent] judge failed', error);
      return { shouldGenerate: false, prompt: null };
    }
  };

  const generateAvatar = async (prompt: string, imageBase64?: string): Promise<string> => {
    const fullPrompt = [
      GEMIE_CHARACTER_BIBLE,
      `Situation: ${prompt}`,
      'Generate a small avatar-style portrait of Gemie reacting to this situation.',
      'Composition: close-up face/upper body, circular crop friendly, simple background.',
      'Style: cute 2D illustration, expressive face, warm colors.',
    ].join(' ');

    console.info('[GemieAvatarAgent] generating avatar', {
      promptPreview: fullPrompt.slice(0, 120),
    });

    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];
      if (imageBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
      }
      parts.push({ text: fullPrompt });

      const response = await Promise.race([
        ai.models.generateContent({
          model: imageModel,
          contents: [{ role: 'user', parts }],
          config: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        new Promise<never>((_resolve, reject) =>
          setTimeout(
            () =>
              reject(new Error(`avatar generation timeout (${AVATAR_GENERATION_TIMEOUT_MS}ms)`)),
            AVATAR_GENERATION_TIMEOUT_MS,
          ),
        ),
      ]);

      const responseParts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of responseParts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType ?? 'image/png';
          console.info('[GemieAvatarAgent] avatar generated', { mimeType });
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }

      console.warn('[GemieAvatarAgent] no image in response');
      return '/gemie.png';
    } catch (error) {
      console.error('[GemieAvatarAgent] generation failed', error);
      return '/gemie.png';
    }
  };

  return { judge, generateAvatar };
};
