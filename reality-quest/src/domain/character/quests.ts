import type { JemieRequest } from '../../types';

// ========== DEMO ONLY — DELETE THIS BLOCK AFTER DEMO ==========
const DEMO_SEED_REQUESTS: readonly JemieRequest[] = [
  {
    id: 'demo-spot-google-office-1',
    category: 'spot',
    prompt: 'ねえねえ！ここってGoogleのオフィスなの？すごーい！ボク、Googleのオフィスの中を見てみたいな〜！見せて見せて！',
    acceptanceCriteria:
      'Googleオフィスの内部や外観が写っていること。Googleのロゴ、看板、オフィス内の風景、受付、会議室、カフェテリアなどが確認できればOK。',
    hintPrompt: 'Googleのロゴとか、オフィスの中の様子を見せてくれると嬉しいな！',
  },
];
// ========== END DEMO ONLY ==========

export const SEED_REQUESTS: readonly JemieRequest[] = [
  // ========== DEMO ONLY — REMOVE `...DEMO_SEED_REQUESTS,` AFTER DEMO ==========
  ...DEMO_SEED_REQUESTS,
  // ========== END DEMO ONLY ==========
  {
    id: 'seed-object-drink-1',
    category: 'object',
    prompt: 'はじめまして！ボクはジェミーだよ。まずは飲み物を見せてほしいな！',
    acceptanceCriteria:
      '飲み物が写っていること。ペットボトル、コップ、缶、水筒など飲料容器であればOK。',
    hintPrompt: '近くにあるお水やジュースのボトルで大丈夫だよ！',
  },
  {
    id: 'seed-scenery-window-1',
    category: 'scenery',
    prompt: 'ねえねえ、窓の外ってどんな景色？ボクにも見せて！',
    acceptanceCriteria:
      '窓から見える外の景色、または屋外の風景が写っていること。明るさや天候は問わない。',
    hintPrompt: '近くの窓にカメラを向けてみて！どんな景色でもボク嬉しいよ。',
  },
  {
    id: 'seed-object-stationery-1',
    category: 'object',
    prompt: 'キミが普段使ってるペンとかノートとか見てみたいな〜。見せて？',
    acceptanceCriteria: '文房具（ペン、鉛筆、ノート、消しゴム、定規など）が1つ以上写っていること。',
    hintPrompt: '机の上のペンやノートで大丈夫だよ！',
  },
];
