# Architecture Codemap

> Freshness: 2026-02-21T14:30:00+09:00

## Overview

**Jemie Growth AR (Reality Quest)** - AR + Gemini API を使った AI キャラクター「ジェミー君」育成アプリ。
プレイヤーがカメラで現実の対象物を提示し、Gemini Vision が判定、成功時にリアクション音声とイラストを表示する育成ループ。

## Tech Stack

| Layer      | Technology                               |
| ---------- | ---------------------------------------- |
| Frontend   | Vite + TypeScript (strict)               |
| 3D/AR      | Three.js + WebXR / iOS camera overlay    |
| AI         | `@google/genai` (Live API, Vision, Text) |
| Validation | Zod                                      |
| Server     | Bun (HTTP server)                        |
| Database   | PostgreSQL 16 (Docker)                   |
| Testing    | Vitest + v8 coverage (80%+ threshold)    |
| Linting    | ESLint + Prettier                        |

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (Vite SPA)                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │  main.ts │→ │gameEngine │→ │ stateStore   │  │
│  │ (entry)  │  │(FSM)      │  │(localStorage)│  │
│  └────┬─────┘  └───────────┘  └──────────────┘  │
│       │                                          │
│  ┌────┴────────────────────────────────┐         │
│  │ AI Services                          │         │
│  │ requestGenerator → geminiJudge       │         │
│  │ reactionRenderer → illustrationSvc   │         │
│  │ liveNarrator     → gemieVoiceChat    │         │
│  └──────────────────────────────────────┘         │
│       │                                          │
│  ┌────┴──────────────────────┐                   │
│  │ AR Layer                   │                   │
│  │ xrRenderer → xrSession    │                   │
│  │ hitTest    → arEffects     │                   │
│  │ iosCameraAR                │                   │
│  └────────────────────────────┘                   │
│       │                                          │
│  ┌────┴──────────┐  ┌─────────────┐              │
│  │ UI Layer       │  │ Camera      │              │
│  │ gameUI         │  │ captureFrame│              │
│  │ domOverlay     │  └─────────────┘              │
│  │ uiPhaseModel   │                               │
│  └────────────────┘                               │
│       │ /api proxy (vite)                         │
└───────┼───────────────────────────────────────────┘
        │
┌───────▼───────────────────────────────────────────┐
│  Server (Bun)                                     │
│  index.ts → postgresService → PostgreSQL          │
│           → memorySummaryService (Gemini)          │
│  schemas.ts (Zod validation)                       │
│  env.ts (environment config)                       │
└───────────────────────────────────────────────────┘
```

## State Machine (GamePhase)

```
menu → listening → requesting → waiting_capture → validating
                       ↑                              │
                       └──── reaction ←── JUDGE_PASSED ┘
                                          JUDGE_FAILED → waiting_capture
                  error ← (any phase on ERROR_OCCURRED)
```

## Key Design Decisions

1. **Immutable state** - GameState は readonly、transition() で新しいオブジェクトを返す
2. **Event-sourced FSM** - `GameEvent` union type で phase 遷移を駆動
3. **Dependency injection** - AI services は factory 関数 + deps で DI、テスト容易
4. **Zod boundary validation** - API 応答、永続化、サーバー入力すべて Zod で検証
5. **Fallback pattern** - AI/外部サービス失敗時のフォールバック実装が全レイヤーにある
6. **Platform detection** - WebXR 対応ブラウザは AR モード、非対応は iOS camera overlay
