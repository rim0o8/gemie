/**
 * Gemini Lyria RealTime API 用 BGM プロンプト定義
 *
 * モデル: models/lyria-realtime-exp
 * API: WebSocket ベースのリアルタイムストリーミング
 *
 * @see https://ai.google.dev/gemini-api/docs/music-generation
 */

export interface BgmPreset {
  /** シーン名 */
  name: string;
  /** 音楽スタイルのプロンプト（複数指定で重み付きブレンド可能） */
  weightedPrompts: Array<{ text: string; weight: number }>;
  /** テンポ (60-200) */
  bpm: number;
  /** 創造性 (0.0-3.0, デフォルト1.1) */
  temperature: number;
  /** 音の密度 (0.0-1.0) */
  density: number;
  /** 音色の明るさ (0.0-1.0) */
  brightness: number;
  /** プロンプト追従度 (0.0-6.0, デフォルト4.0) */
  guidance: number;
}

// ============================================================
// Reality Quest BGM プリセット
// ============================================================

/** メニュー / タイトル画面 */
export const MENU_BGM: BgmPreset = {
  name: 'menu',
  weightedPrompts: [
    {
      text: 'Mysterious ambient electronic with ethereal pads, soft arpeggios, and a sense of wonder. Fantasy adventure game menu music.',
      weight: 0.7,
    },
    {
      text: 'Cinematic orchestral strings with gentle harp, magical and inviting atmosphere',
      weight: 0.3,
    },
  ],
  bpm: 80,
  temperature: 1.0,
  density: 0.3,
  brightness: 0.5,
  guidance: 4.0,
};

/** 試練提示 / クエスト開始演出 */
export const QUEST_ANNOUNCE_BGM: BgmPreset = {
  name: 'quest-announce',
  weightedPrompts: [
    {
      text: 'Epic orchestral buildup with deep brass, timpani rolls, and rising tension. A quest is about to begin. Fantasy RPG announcement fanfare.',
      weight: 0.8,
    },
    {
      text: 'Mysterious choir vocals with reverb, ancient ritual atmosphere',
      weight: 0.2,
    },
  ],
  bpm: 100,
  temperature: 0.9,
  density: 0.5,
  brightness: 0.6,
  guidance: 4.5,
};

/** 探索フェーズ（アイテムを探している最中） */
export const EXPLORATION_BGM: BgmPreset = {
  name: 'exploration',
  weightedPrompts: [
    {
      text: 'Adventurous lo-fi electronic with playful synth melodies, light percussion, and curious wandering feel. Exploration music for a treasure hunt game.',
      weight: 0.6,
    },
    {
      text: 'Upbeat acoustic guitar with pizzicato strings, whimsical and lighthearted',
      weight: 0.4,
    },
  ],
  bpm: 110,
  temperature: 1.2,
  density: 0.4,
  brightness: 0.6,
  guidance: 3.5,
};

/** 判定待ち / カメラでアイテムを提示中 */
export const JUDGING_BGM: BgmPreset = {
  name: 'judging',
  weightedPrompts: [
    {
      text: 'Tense suspenseful electronic with pulsing bass, ticking clock-like percussion, and building anticipation. Will it pass the test?',
      weight: 0.7,
    },
    {
      text: 'Minimal techno with deep sub-bass and sparse hi-hats, nervous energy',
      weight: 0.3,
    },
  ],
  bpm: 120,
  temperature: 0.8,
  density: 0.5,
  brightness: 0.4,
  guidance: 4.0,
};

/** 正解 / 封印解除成功 */
export const SUCCESS_BGM: BgmPreset = {
  name: 'success',
  weightedPrompts: [
    {
      text: 'Triumphant orchestral fanfare with bright brass, shimmering cymbals, and uplifting chord progression. Victory moment in a fantasy game. Celebration and achievement.',
      weight: 0.8,
    },
    {
      text: 'Sparkling synth arpeggios with euphoric pads, magical power unleashed',
      weight: 0.2,
    },
  ],
  bpm: 130,
  temperature: 1.0,
  density: 0.7,
  brightness: 0.8,
  guidance: 4.5,
};

/** 不正解 / ヒント提示 */
export const FAILURE_BGM: BgmPreset = {
  name: 'failure',
  weightedPrompts: [
    {
      text: 'Somber piano with minor key melody, gentle strings, and a reflective mood. Not quite right, but there is still hope. Encouraging undertone.',
      weight: 0.7,
    },
    {
      text: 'Soft ambient pads with subtle dissonance, mysterious hint atmosphere',
      weight: 0.3,
    },
  ],
  bpm: 70,
  temperature: 1.0,
  density: 0.2,
  brightness: 0.3,
  guidance: 4.0,
};

/** 最終試練 / ボス演出 */
export const FINAL_QUEST_BGM: BgmPreset = {
  name: 'final-quest',
  weightedPrompts: [
    {
      text: 'Intense cinematic orchestral with driving percussion, epic choir, powerful brass, and soaring strings. Final boss battle in a fantasy RPG. High stakes and drama.',
      weight: 0.7,
    },
    {
      text: 'Heavy electronic bass drops with distorted synths, urgent and relentless energy',
      weight: 0.3,
    },
  ],
  bpm: 140,
  temperature: 1.3,
  density: 0.8,
  brightness: 0.7,
  guidance: 4.5,
};

/** エンディング / クリア後 */
export const ENDING_BGM: BgmPreset = {
  name: 'ending',
  weightedPrompts: [
    {
      text: 'Peaceful orchestral waltz with warm strings, gentle flute, and harp. A journey well completed. Nostalgic and heartwarming ending credits music.',
      weight: 0.6,
    },
    {
      text: 'Ambient chillout with soft piano chords and atmospheric reverb, serene conclusion',
      weight: 0.4,
    },
  ],
  bpm: 90,
  temperature: 1.1,
  density: 0.3,
  brightness: 0.6,
  guidance: 3.5,
};

/** 音声会話フェーズ（ジェミーとおしゃべり中） */
export const VOICE_CHAT_BGM: BgmPreset = {
  name: 'voice-chat',
  weightedPrompts: [
    {
      text: 'Cozy lo-fi hip hop with warm vinyl crackle, mellow Rhodes piano chords, and soft brush drums. Relaxing cafe atmosphere, friendly conversation background music.',
      weight: 0.6,
    },
    {
      text: 'Gentle acoustic ukulele with light finger snaps and soft marimba, playful and intimate',
      weight: 0.4,
    },
  ],
  bpm: 85,
  temperature: 1.1,
  density: 0.2,
  brightness: 0.5,
  guidance: 3.5,
};

/** 思い出振り返りセッション */
export const RECALL_BGM: BgmPreset = {
  name: 'recall',
  weightedPrompts: [
    {
      text: 'Nostalgic music box melody with soft celesta, gentle strings, and dreamy reverb. Looking through a photo album of cherished memories. Bittersweet and warm.',
      weight: 0.7,
    },
    {
      text: 'Ambient piano with slow arpeggios and shimmering bell tones, twilight atmosphere',
      weight: 0.3,
    },
  ],
  bpm: 72,
  temperature: 1.0,
  density: 0.2,
  brightness: 0.4,
  guidance: 4.0,
};

// ============================================================
// 全プリセット一覧
// ============================================================

export const ALL_BGM_PRESETS: Record<string, BgmPreset> = {
  menu: MENU_BGM,
  'quest-announce': QUEST_ANNOUNCE_BGM,
  exploration: EXPLORATION_BGM,
  judging: JUDGING_BGM,
  success: SUCCESS_BGM,
  failure: FAILURE_BGM,
  'final-quest': FINAL_QUEST_BGM,
  ending: ENDING_BGM,
  'voice-chat': VOICE_CHAT_BGM,
  recall: RECALL_BGM,
};
