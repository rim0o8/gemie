import { GoogleGenAI } from '@google/genai';
import { reactionSchema } from '../../shared/schemas';
import { parseGeminiJson } from '../../shared/utils';
import type { JudgeResult, ReactionRenderer, ReactionResult } from '../../types';

export const parseReactionResponse = (text: string): ReactionResult =>
  parseGeminiJson(text, reactionSchema, 'reaction response');

type CreateReactionRendererDeps = {
  readonly generateText: (prompt: string) => Promise<string>;
};

export const createReactionRenderer = (deps: CreateReactionRendererDeps): ReactionRenderer => ({
  render: async (requestPrompt: string, judge: JudgeResult): Promise<ReactionResult> => {
    const matchedLabel = judge.matchedObjects.length > 0 ? judge.matchedObjects.join('、') : '';

    const situationLines = judge.passed
      ? [
          `飼い主が見せてくれたもの: ${matchedLabel || '（お願いに合うもの）'}`,
          `様子: ${judge.reason}`,
          '',
          '## 生成ルール',
          '- 飼い主が見せてくれたことに喜び、感謝するセリフを生成する',
          '- 見せてくれたものに具体的に言及して「わあ、〇〇だ！」のように反応する',
        ]
      : [
          `飼い主が見せてくれたもの: ${matchedLabel || '（お願いとは違うもの）'}`,
          `様子: ${judge.reason}`,
          '',
          '## 生成ルール',
          '- 見せてくれたこと自体には感謝しつつ、別のものが見たいなと甘える',
          '- 「ありがとう！でも〇〇が見たいな〜」のように優しくお願いする',
        ];

    const prompt = [
      'あなたはAIキャラクター「ジェミー君」のリアクションを生成するシステムです。',
      'ジェミー君は好奇心旺盛で甘えん坊な小さなハリネズミのような生き物です。',
      '',
      '## 出力形式（JSONのみ、コードブロック不要）',
      '{"voiceText":string,"illustrationPrompt":string,"emotionTag":string}',
      '',
      '## フィールド説明',
      '- voiceText: ジェミー君のセリフ（音声で読み上げられる）。一人称は「ボク」、語尾は「〜だよ」「〜なの」「〜だね」を使う。1〜2文で短くかわいく。',
      '- illustrationPrompt: ジェミー君のイラスト生成用プロンプト（英語、cute hedgehog mascot の感情表現を描写）',
      '- emotionTag: 感情タグ（happy, excited, grateful, surprised, touched など）',
      '',
      '## 状況',
      `ジェミー君のお願い: ${requestPrompt}`,
      ...situationLines,
      '- voiceTextはそのまま音声で読み上げられるので、自然な話し言葉にする',
      '- 「合格」「不合格」「判定」などシステム用語は絶対に使わない',
    ].join('\n');

    try {
      return parseReactionResponse(await deps.generateText(prompt));
    } catch (error) {
      console.error('[ReactionRenderer] fallback', error);
      return judge.passed
        ? {
            voiceText: 'わーい！見せてくれてありがとう！ボクすっごく嬉しいよ！',
            illustrationPrompt:
              'cute hedgehog mascot celebrating with sparkling eyes, joyful, vibrant colors',
            emotionTag: 'excited',
          }
        : {
            voiceText: 'ありがとう！でもボク、もうちょっと違うのが見たいな〜。',
            illustrationPrompt:
              'cute hedgehog mascot looking hopeful with big eyes, gentle expression',
            emotionTag: 'hopeful',
          };
    }
  },
});

export const createGeminiReactionRenderer = (
  apiKey: string,
  model: string = 'gemini-2.5-flash',
): ReactionRenderer => {
  const ai = new GoogleGenAI({ apiKey });
  return createReactionRenderer({
    generateText: async (prompt: string): Promise<string> => {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return response.text ?? '';
    },
  });
};
