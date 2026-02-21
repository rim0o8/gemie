import { GoogleGenAI } from '@google/genai';
import type { SaveMemoryInput } from './schemas';

type MemorySummaryServiceOptions = {
  readonly apiKey: string;
  readonly model: string;
};

const fallbackSummary = (input: SaveMemoryInput): string => {
  const matched =
    input.matchedObjects.length > 0 ? input.matchedObjects.join('、') : 'すてきなもの';
  return `飼い主が${matched}を見せてくれたよ！`;
};

export const createMemorySummaryService = (options: MemorySummaryServiceOptions) => {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });

  const summarize = async (input: SaveMemoryInput): Promise<string> => {
    try {
      const matched = input.matchedObjects.length > 0 ? input.matchedObjects.join('、') : '';

      const response = await ai.models.generateContent({
        model: options.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'あなたはペット育成ゲームの思い出要約アシスタントです。',
                  'ジェミー君（小さなハリネズミのような生き物）が飼い主との楽しい体験を振り返るための1文（40文字以内）を日本語で作ってください。',
                  '',
                  '## 情報',
                  `飼い主が見せてくれたもの: ${matched || '何か素敵なもの'}`,
                  `状況の補足: ${input.judgeReason}`,
                  '',
                  '## ルール',
                  '- ジェミー君の一人称「ボク」で、楽しかった体験として書く',
                  '- 例: 「飼い主がおいしそうなクッキーを見せてくれたよ！」',
                  '- 例: 「きれいな夕焼けを一緒に見たの、嬉しかったな〜」',
                  '- 「合格」「判定」「条件」などのシステム用語は絶対に使わない',
                ].join('\n'),
              },
            ],
          },
        ],
      });
      const text = response.text?.trim();
      if (!text) return fallbackSummary(input);
      return text.slice(0, 80);
    } catch {
      return fallbackSummary(input);
    }
  };

  return { summarize };
};
