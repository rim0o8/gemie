import { GoogleGenAI } from '@google/genai';
import { requestSchema } from '../../shared/schemas';
import { parseGeminiJson } from '../../shared/utils';
import { SEED_REQUESTS } from '../character/quests';
import type { GameState, JemieRequest, RequestGenerator } from '../../types';

export const parseRequestResponse = (text: string): JemieRequest =>
  parseGeminiJson(text, requestSchema, 'request response');

type TimeSlot = 'morning' | 'daytime' | 'evening' | 'night';

const getTimeSlot = (date: Date): TimeSlot => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'daytime';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const timeSlotFallbacks: Record<TimeSlot, JemieRequest> = {
  morning: {
    id: 'fallback-morning',
    category: 'scenery',
    prompt: 'おはよう〜！今日のお天気はどんな感じ？窓の外を見せてほしいな。',
    acceptanceCriteria: '窓や外の景色が写っていること',
    hintPrompt: '窓の外の空を見せてくれると嬉しいな。',
  },
  daytime: {
    id: 'fallback-daytime',
    category: 'food',
    prompt: 'ランチタイムだね〜！何か美味しそうなもの見せてくれる？',
    acceptanceCriteria: '食べ物や飲み物が写っていること',
    hintPrompt: 'お昼ごはんや飲み物を見せてみて。',
  },
  evening: {
    id: 'fallback-evening',
    category: 'scenery',
    prompt: '夕方だね〜。今いる場所の雰囲気を見せてほしいな。',
    acceptanceCriteria: '周囲の風景や室内の様子が写っていること',
    hintPrompt: '今いる場所をそのまま見せてくれればOKだよ。',
  },
  night: {
    id: 'fallback-night',
    category: 'object',
    prompt: 'おつかれさま〜。今日のお気に入りのもの、何か見せてくれる？',
    acceptanceCriteria: '何らかの物体がはっきり写っていること',
    hintPrompt: '身の回りにある好きなものを見せてみて。',
  },
};

const buildFallbackRequest = (now: string): JemieRequest => {
  const date = new Date(now);
  const slot = getTimeSlot(date);
  return { ...timeSlotFallbacks[slot], id: `fallback-${now}` };
};

type CreateRequestGeneratorDeps = {
  readonly generateText: (prompt: string) => Promise<string>;
  readonly now?: () => string;
};

export const createRequestGenerator = (deps: CreateRequestGeneratorDeps): RequestGenerator => ({
  generate: async (state: GameState): Promise<JemieRequest> => {
    if (state.requestHistory.length === 0) {
      return SEED_REQUESTS[0];
    }

    const now = deps.now?.() ?? new Date().toISOString();
    const date = new Date(now);
    const timeSlot = getTimeSlot(date);
    const hour = date.getHours();
    const usedIds = state.requestHistory.map((h) => h.requestId).join(', ');

    const timeContext: Record<TimeSlot, string> = {
      morning: `現在は朝${hour}時です。朝の挨拶や今日の予定に関する質問から始めて、「見せて」とお願いにつなげてください。`,
      daytime: `現在は昼${hour}時です。ランチや今やっていることに関する質問から始めて、「見せて」とお願いにつなげてください。`,
      evening: `現在は夕方${hour}時です。今日の出来事や夕食に関する質問から始めて、「見せて」とお願いにつなげてください。`,
      night: `現在は夜${hour}時です。今日の振り返りやリラックスタイムに関する質問から始めて、「見せて」とお願いにつなげてください。`,
    };

    const prompt = [
      'あなたはAIキャラクター「ジェミー君」の要望を生成するシステムです。',
      'ジェミー君は好奇心旺盛で甘えん坊な小さなハリネズミのような生き物です。',
      '一人称は「ボク」、語尾は「〜だよ」「〜なの」「〜してほしいな」を使います。',
      '',
      '## 出力形式（JSONのみ、コードブロック不要）',
      '{"id":string,"category":"food"|"scenery"|"object"|"spot","prompt":string,"acceptanceCriteria":string,"hintPrompt":string}',
      '',
      '## フィールド説明',
      '- id: ユニークな識別子（例: "req-food-ramen-1"）',
      '- category: "food"（食べ物・飲み物）, "scenery"（景色・風景）, "object"（物・小物）, "spot"（周辺スポット・お店）',
      '- prompt: ジェミー君が飼い主にお願いするセリフ。1〜2文、かわいく甘える口調',
      '- acceptanceCriteria: 画像判定AIが使う合格条件（日本語、具体的に）',
      '- hintPrompt: 飼い主へのヒント（ジェミー君口調、やさしく）',
      '',
      '## 時刻コンテキスト',
      timeContext[timeSlot],
      '',
      usedIds ? `- 過去のリクエストID: ${usedIds}（同じものは避ける）` : '',
      '',
      ...(state.location
        ? [
            '## ユーザーの現在地情報',
            ...(state.location.address
              ? [`- 現在地: ${state.location.address}`]
              : []),
            `- 緯度: ${state.location.latitude}`,
            `- 経度: ${state.location.longitude}`,
            `- 精度: ${state.location.accuracy}m`,
            '',
            '## 位置情報に基づく生成ルール',
            '- category="spot" を使って、周辺の有名スポット・お店・ランドマークに関するリクエストを生成できる',
            '- 確実に存在する有名なランドマークや駅、公園、有名店を優先する（存在しない場所を捏造しない）',
            '- そのエリアの特徴的な食べ物やお店を提案してもよい',
            '- 知らないエリアや情報に自信がない場合は、無理せず通常カテゴリ（food/scenery/object）で生成する',
            '- spotリクエストの場合、acceptanceCriteriaはスポットの建物外観・看板・店内・料理などを基準にする',
            '',
          ]
        : ['']),
      '## 生成ルール',
      '- 時間帯に合った自然な会話から写真リクエストにつなげる',
      '- 身の回りにありそうな現実的なものをお願いする（例: ペン、本、コップ、お菓子、窓の外の景色）',
      '- promptは画面に表示されるので、かわいくて読みやすい短いセリフにする',
      '- acceptanceCriteriaは判定AIが使うので、具体的かつ寛容な基準にする',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      return parseRequestResponse(await deps.generateText(prompt));
    } catch (error) {
      console.error('[RequestGenerator] fallback', error);
      return buildFallbackRequest(now);
    }
  },
});

const GENERATE_TIMEOUT_MS = 10000;

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms),
    ),
  ]);

export const createGeminiRequestGenerator = (
  apiKey: string,
  model: string = 'gemini-2.5-flash',
): RequestGenerator => {
  const ai = new GoogleGenAI({ apiKey });
  return createRequestGenerator({
    generateText: async (prompt: string): Promise<string> => {
      const response = await withTimeout(
        ai.models.generateContent({ model, contents: prompt }),
        GENERATE_TIMEOUT_MS,
        'generateContent',
      );
      return response.text ?? '';
    },
  });
};
