# Data Models Codemap

> Freshness: 2026-02-21T14:30:00+09:00

## Core Types (`src/types.ts`)

### GameState

アプリ全体の状態。localStorage に永続化される。

```typescript
type GameState = {
  phase: GamePhase; // FSM の現在フェーズ
  affection: number; // 好感度 (0-100)
  hunger: number; // 空腹度 (0-100)
  mood: JemieMood; // 気分
  currentRequest: JemieRequest | null;
  lastJudge: JudgeResult | null;
  lastIllustrationUrl: string | null;
  requestHistory: RequestHistoryItem[]; // 最大20件
  memories: MemoryItem[]; // サーバーから取得した思い出一覧
  conversation: ConversationState;
  updatedAt: string; // ISO 8601
};
```

### GamePhase (FSM states)

`'menu' | 'listening' | 'requesting' | 'waiting_capture' | 'validating' | 'reaction' | 'error'`

### GameEvent (FSM events)

Union type: `START_AR | REQUEST_READY | REQUEST_SPOKEN | CAPTURE_SUBMIT | JUDGE_PASSED | JUDGE_FAILED | REACTION_DONE | MEMORY_SAVED | MEMORY_LIST_LOADED | VOICE_STATE_UPDATED | ERROR_OCCURRED | RESET`

### JemieRequest

```typescript
type JemieRequest = {
  id: string;
  category: 'food' | 'scenery' | 'object';
  prompt: string;
  acceptanceCriteria: string;
  hintPrompt: string;
};
```

### JudgeResult

```typescript
type JudgeResult = {
  passed: boolean;
  reason: string;
  confidence: number; // 0-1
  matchedObjects: string[];
  safety: 'safe' | 'unsafe' | 'unknown';
};
```

### ReactionResult

```typescript
type ReactionResult = {
  voiceText: string;
  illustrationPrompt: string;
  emotionTag: string;
};
```

### MemoryItem

```typescript
type MemoryItem = {
  id: string;
  imageUrl: string;
  summary: string;
  createdAt: string;
  sourceRequestId: string;
  emotionTag: string | null;
};
```

### ConversationState

```typescript
type ConversationState = {
  isLiveConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  lastTranscript: string | null;
  lastError: string | null;
};
```

## Service Interfaces

| Interface           | Method                         | Input → Output            |
| ------------------- | ------------------------------ | ------------------------- |
| Narrator            | speak(prompt)                  | Promise\<void\>           |
| Judge               | evaluate(imageBase64, request) | Promise\<JudgeResult\>    |
| RequestGenerator    | generate(state)                | Promise\<JemieRequest\>   |
| ReactionRenderer    | render(requestPrompt, judge)   | Promise\<ReactionResult\> |
| IllustrationService | generate(prompt)               | Promise\<string\> (URL)   |

##育成パラメータ (Nurturing Parameters)

| Event          | affection | hunger |
| -------------- | --------- | ------ |
| Initial        | 50        | 40     |
| Success        | +8        | -12    |
| Failure        | -2        | +4     |
| Cycle progress | -         | +3     |

### Mood Derivation

1. hunger >= 80 → `'hungry'`
2. recent success → `'excited'`
3. affection >= 70 → `'happy'`
4. otherwise → `'neutral'`

## Database Schema

### `memories` table (PostgreSQL)

| Column            | Type        | Constraint                    |
| ----------------- | ----------- | ----------------------------- |
| id                | UUID        | PK, DEFAULT gen_random_uuid() |
| image_url         | TEXT        | NOT NULL                      |
| summary           | TEXT        | NOT NULL                      |
| source_request_id | TEXT        | NOT NULL                      |
| emotion_tag       | TEXT        | nullable                      |
| created_at        | TIMESTAMPTZ | NOT NULL DEFAULT now()        |

## Validation Boundaries

Zod validation is applied at:

1. **Runtime config** - `src/config.ts` (env vars → RuntimeConfig)
2. **Server env** - `server/src/env.ts` (process.env → ServerEnv)
3. **AI responses** - geminiJudge, requestGenerator, reactionRenderer (loose parsing)
4. **localStorage** - `src/stateStore.ts` (load → validate → fallback to initial)
5. **API requests** - `server/src/schemas.ts` (saveMemoryInputSchema)
6. **API responses** - `src/memoryApiClient.ts` (memoryItemSchema, memoriesResponseSchema)
