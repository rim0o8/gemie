# Jemie Growth AR — 仕様書

## 概要

**Jemie Growth AR** は、AR と Gemini API を使って AI キャラクター「ジェミー君」を育成するアプリです。  
ジェミー君はリアルタイムで「食べ物がほしい」「景色が見たい」などの要望を話し、プレイヤーは現実の対象をカメラに提示します。  
Gemini Vision が要望達成を判定し、成功時はジェミー君のリアクション音声とイラストを表示します。

---

## MVP スコープ

1. 育成ループ優先（要望生成 → 提示 → 判定 → 状態更新）
2. ローカル永続化（LocalStorage）
3. 判定は Vision JSON（structured output）
4. 要望更新は達成時のみ
5. イラスト生成は成功時のみ

---

## ゲームフロー

```text
[起動]
  ↓
[phase: menu]
  AR 開始
  ↓
[phase: listening]
  要望生成準備
  ↓
[phase: requesting]
  ジェミー君が要望を話す
  ↓
[phase: waiting_capture]
  プレイヤーが対象を見せる
  ↓
[phase: validating]
  Vision 判定
   ├─ passed: false → waiting_capture（ヒント音声）
   └─ passed: true  → reaction
                     ↓
                 [phase: reaction]
                 リアクション音声 + イラスト表示
                 状態更新後、次要望へ
                     ↓
                 requesting
```

---

## ステートマシン

```text
menu
  └─ START_AR -> listening

listening
  ├─ REQUEST_READY -> requesting
  └─ ERROR_OCCURRED -> error

requesting
  ├─ REQUEST_SPOKEN -> waiting_capture
  ├─ REQUEST_READY -> requesting (上書き)
  └─ ERROR_OCCURRED -> error

waiting_capture
  ├─ CAPTURE_SUBMIT -> validating
  └─ ERROR_OCCURRED -> error

validating
  ├─ JUDGE_PASSED -> reaction
  ├─ JUDGE_FAILED -> waiting_capture
  └─ ERROR_OCCURRED -> error

reaction
  ├─ REACTION_DONE -> requesting
  └─ ERROR_OCCURRED -> error

error
  ├─ START_AR -> listening
  └─ RESET -> menu
```

---

## データモデル

### GameState

- `phase: GamePhase`
- `affection: number` (0-100)
- `hunger: number` (0-100)
- `mood: 'happy' | 'neutral' | 'hungry' | 'excited'`
- `currentRequest: JemieRequest | null`
- `lastJudge: JudgeResult | null`
- `lastIllustrationUrl: string | null`
- `requestHistory: RequestHistoryItem[]`
- `updatedAt: string` (ISO)

### JemieRequest

- `id: string`
- `category: 'food' | 'scenery' | 'object'`
- `prompt: string`
- `acceptanceCriteria: string`
- `hintPrompt: string`

### JudgeResult

- `passed: boolean`
- `reason: string`
- `confidence: number` (0-1)
- `matchedObjects: string[]`
- `safety: 'safe' | 'unsafe' | 'unknown'`

### ReactionResult

- `voiceText: string`
- `illustrationPrompt: string`
- `emotionTag: string`

---

## 育成パラメータ（MVP固定）

- 初期値: `affection=50`, `hunger=40`, `mood='neutral'`
- 成功時: `affection +8`, `hunger -12`
- 失敗時: `affection -2`, `hunger +4`
- 成功後の次サイクル移行時: `hunger +3`

気分決定ロジック:

1. `hunger >= 80` -> `hungry`
2. 直近成功 -> `excited`
3. `affection >= 70` -> `happy`
4. それ以外 -> `neutral`

---

## AI 連携

### 1. Live API

- 用途: 要望音声、ヒント音声、成功時リアクション音声
- モデル: `VITE_GEMINI_LIVE_MODEL`（既定: `gemini-2.0-flash-live-001`）

### 2. Vision Judge

- 用途: カメラ画像が要望条件を満たすか判定
- 出力: strict JSON
- モデル: `VITE_GEMINI_TEXT_MODEL`（既定: `gemini-2.0-flash`）

### 3. Nano Banana（Illustration Service）

- 用途: 成功時イラスト生成
- 設定:
  - `VITE_NANO_BANANA_ENDPOINT`（任意）
  - `VITE_NANO_BANANA_API_KEY`（任意）
- 未設定時はフォールバック SVG を表示

---

## 永続化

- 保存先: `localStorage`
- key: `jemie-state-v1`
- 復元時: Zod スキーマで検証
- 破損/不一致時: 保存データ削除して初期状態で再開

---

## エラーハンドリング

- API 失敗時は `error` phase に遷移
- `requestGenerator` / `reactionRenderer` / `illustrationService` はフォールバック実装あり
- 画像判定の不正応答は失敗扱いで安全側に倒す

---

## 技術スタック

- Vite + TypeScript (strict)
- Three.js + WebXR/iOS camera overlay
- `@google/genai` (Live + Vision + text generation)
- Zod (外部応答/永続化境界の検証)
- Vitest (unit, coverage >= 80%)

---

## テスト観点（MVP）

1. ステート遷移（成功/失敗/エラー/リセット）
2. 育成値更新（好感度・空腹度・気分）
3. Vision JSON parse とフォールバック
4. 要望生成/リアクション生成の parse とフォールバック
5. LocalStorage 保存/復元/破損回復
