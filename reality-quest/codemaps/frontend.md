# Frontend Codemap

> Freshness: 2026-02-21T14:30:00+09:00

## Entry Point

- `src/main.ts` - アプリのエントリーポイント。全サービス初期化、dispatch loop、AR 起動/停止フロー

## Core Modules

### State Management

- `src/types.ts` - 全型定義 (GameState, GameEvent, GamePhase, JemieRequest, JudgeResult, etc.)
- `src/stateStore.ts` - localStorage 永続化 (Zod validation + createInitialState fallback)
- `src/gameEngine.ts` - FSM transition 関数 (state + event → new state)、isCapturePhase helper
- `src/jemieAgent.ts` - 育成パラメータ計算 (applySuccessOutcome, applyFailureOutcome, applyCycleProgress, deriveMood)

### AI Services

- `src/geminiJudge.ts` - Vision 画像判定 (`@google/genai` + Zod parse, loose boolean/confidence normalization)
- `src/requestGenerator.ts` - 要望生成 (Gemini text + SEED_REQUESTS fallback)
- `src/reactionRenderer.ts` - リアクション演出生成 (Gemini text + fallback)
- `src/illustrationService.ts` - イラスト生成 (外部API or SVG fallback)
- `src/liveNarrator.ts` - Live API 音声再生 (PCM16→Float32 変換, AudioContext 再生, SpeechSynthesis fallback)
- `src/gemieVoiceChat.ts` - 音声会話 (SpeechRecognition + narrator, memory context)
- `src/gemieCharacter.ts` - キャラクタービジュアル設定 (character bible, illustration prompt builder)

### Data

- `src/quests.ts` - シードクエスト定義 (初回要望の固定データ)
- `src/config.ts` - 環境変数パース (Zod schema → RuntimeConfig)
- `src/memoryApiClient.ts` - Memory REST API クライアント (list, random, save)

### UI Layer

- `src/ui/gameUI.ts` - UI 更新オーケストレーション (updateUI, initUI)
- `src/ui/domOverlay.ts` - DOM 操作関数群 (stats, quest panel, loading, error banner, illustration)
- `src/ui/uiPhaseModel.ts` - phase→UI状態マッピング (captureEnabled, showLoading, statusMessage etc.)

### AR Layer

- `src/ar/xrRenderer.ts` - Three.js WebGLRenderer + ARButton + render loop
- `src/ar/xrSession.ts` - XR session lifecycle (sessionstart/sessionend handlers)
- `src/ar/hitTest.ts` - XR hit test setup + reticle mesh
- `src/ar/arEffects.ts` - AR visual effects (seal-break, portal-open, final-gate particles/rings)
- `src/ar/iosCameraAR.ts` - iOS fallback AR (camera stream + DeviceOrientation + Three.js overlay)

### Camera

- `src/camera/captureFrame.ts` - カメラ取得 + base64 frame キャプチャ (getUserMedia, canvas.toDataURL)

## Dependency Graph (simplified)

```
main.ts
├── config.ts
├── gameEngine.ts ← jemieAgent.ts
├── stateStore.ts ← jemieAgent.ts
├── geminiJudge.ts
├── requestGenerator.ts ← quests.ts
├── reactionRenderer.ts
├── illustrationService.ts
├── liveNarrator.ts
├── gemieVoiceChat.ts
├── memoryApiClient.ts
├── gemieCharacter.ts
├── camera/captureFrame.ts
├── ui/gameUI.ts ← ui/domOverlay.ts, ui/uiPhaseModel.ts
└── ar/xrRenderer.ts, ar/xrSession.ts, ar/hitTest.ts, ar/arEffects.ts, ar/iosCameraAR.ts
```

## Testing

テストファイル: `tests/` 配下 (18 files)

- Unit tests: stateStore, gameEngine, jemieAgent, geminiJudge, requestGenerator, reactionRenderer, illustrationService, memoryApiClient, captureFrame, gameUI, uiPhaseModel, gemieCharacter, xrSession, iosCameraAR, config, liveNarrator
- Integration: `liveLLM.integration.test.ts` (LIVE_LLM_TEST=1 で有効化)
- Coverage threshold: 80% (lines, functions, branches, statements)
