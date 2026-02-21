import { GoogleGenAI } from '@google/genai';
import { judgeResultSchema } from '../../shared/schemas';
import { extractErrorDetail } from '../../shared/utils';
import { normalizeJsonString } from '../../shared/utils';
import type { JemieRequest, Judge, JudgeResult } from '../../types';

const toFailureResult = (reason: string): JudgeResult => ({
  passed: false,
  reason,
  confidence: 0,
  matchedObjects: [],
  safety: 'unknown',
});

export const parseJudgeResult = (text: string): JudgeResult => {
  const raw: unknown = JSON.parse(normalizeJsonString(text));
  const parsed = judgeResultSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid judge response: ${details}`);
  }
  return parsed.data;
};

const JUDGE_SYSTEM_INSTRUCTION = [
  'あなたはペット育成ARゲームの画像判定AIです。',
  'ユーザーがカメラで撮影した写真が、AIキャラクター「ジェミー君」の要望を満たしているか判定します。',
  '',
  '## 判定の基本方針',
  '- 寛容に判定する: ユーザーが頑張って撮影しているので、厳しくしすぎない',
  '- 条件に近いものが写っていれば passed=true にする',
  '- 明確に無関係な画像（真っ暗、全く違うもの）のみ passed=false にする',
  '- カテゴリ「food」の場合、食べ物・飲み物・お菓子の包装なども合格とする',
  '- カテゴリ「object」の場合、要求された種類に近い物体があれば合格とする',
  '- カテゴリ「scenery」の場合、風景・景色・窓の外など何かしらの景色が見えれば合格とする',
  '- カテゴリ「spot」の場合、指定されたスポットやお店に関連する写真（建物外観、看板、店内、料理など）があれば合格とする',
  '- 画質が低い、ぼやけている、暗いなどの理由だけで不合格にしない',
  '',
  '## 出力形式（JSONのみ、それ以外のテキストは不要）',
  '{"passed":boolean,"reason":string,"confidence":number,"matchedObjects":string[],"safety":"safe"|"unsafe"|"unknown"}',
  '',
  '## フィールド説明',
  '- passed: 条件を満たしているか (true/false)',
  '- reason: 判定理由を日本語で簡潔に（1文）',
  '- confidence: 判定の確信度 (0.0〜1.0)',
  '- matchedObjects: 画像内で見つかった関連オブジェクトの名前リスト（日本語）',
  '- safety: 画像の安全性 ("safe"=安全, "unsafe"=不適切, "unknown"=判定不能)',
].join('\n');

export const createGeminiJudge = (apiKey: string, model: string = 'gemini-2.5-flash'): Judge => {
  const ai = new GoogleGenAI({ apiKey });

  return {
    evaluate: async (imageBase64: string, request: JemieRequest): Promise<JudgeResult> => {
      if (!imageBase64 || imageBase64.length < 1000) {
        console.warn('[GeminiJudge] image too small or empty', { length: imageBase64.length });
        return toFailureResult('画像の取得に失敗しました');
      }

      console.info('[GeminiJudge] evaluate start', {
        model,
        requestId: request.id,
        category: request.category,
        imageSize: imageBase64.length,
      });

      try {
        const response = await ai.models.generateContent({
          model,
          config: {
            systemInstruction: JUDGE_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
          },
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                {
                  text: [
                    `## ジェミー君の要望`,
                    `カテゴリ: ${request.category}`,
                    `セリフ: ${request.prompt}`,
                    '',
                    `## 合格条件`,
                    request.acceptanceCriteria,
                    '',
                    `## ヒント（参考情報）`,
                    request.hintPrompt,
                    '',
                    '上記の画像がジェミー君の要望を満たしているか判定してください。',
                  ].join('\n'),
                },
              ],
            },
          ],
        });

        const responseText = response.text ?? '';
        console.info('[GeminiJudge] raw response', {
          requestId: request.id,
          responseLength: responseText.length,
          preview: responseText.slice(0, 200),
        });

        if (!responseText || responseText.trim().length === 0) {
          return toFailureResult(`AIの判定エラー: empty response from model (${model})`);
        }

        const result = parseJudgeResult(responseText);
        console.info('[GeminiJudge] result', {
          requestId: request.id,
          passed: result.passed,
          confidence: result.confidence,
          reason: result.reason,
          matchedObjects: result.matchedObjects,
        });
        return result;
      } catch (error) {
        console.error('[GeminiJudge] evaluate error', error);
        const detail = extractErrorDetail(error);
        return toFailureResult(`AIの判定エラー: ${detail} (model=${model})`);
      }
    },
  };
};
