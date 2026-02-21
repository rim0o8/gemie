# Backend Codemap

> Freshness: 2026-02-21T14:30:00+09:00

## Overview

Bun HTTP サーバー。Memory (思い出) の CRUD API を提供。Gemini API で思い出の要約を生成し PostgreSQL に保存する。

## Entry Point

- `server/src/index.ts` - Bun.serve HTTP server (port 8787, auto-increment on conflict)

## Modules

### Core

- `server/src/index.ts` - HTTP routing, CORS headers, request handling
- `server/src/env.ts` - サーバー環境変数パース (Zod schema → ServerEnv)
- `server/src/schemas.ts` - 共通 Zod スキーマ (SaveMemoryInput, MemoryItem)

### Services

- `server/src/postgresService.ts` - PostgreSQL CRUD (postgres.js library, parameterized queries)
- `server/src/memorySummaryService.ts` - Gemini text で思い出を1文要約
- `server/src/supabaseService.ts` - Supabase REST API 版 (画像アップロード + DB 操作、現在未使用だが実装済み)

## API Endpoints

| Method  | Path                   | Description                                                                            |
| ------- | ---------------------- | -------------------------------------------------------------------------------------- |
| GET     | `/api/memories`        | 全思い出一覧 (created_at DESC)                                                         |
| GET     | `/api/memories/random` | ランダム1件取得                                                                        |
| POST    | `/api/memories`        | 新規思い出作成 (imageBase64, sourceRequestId, judgeReason, matchedObjects, capturedAt) |
| OPTIONS | `*`                    | CORS preflight                                                                         |

## Database

### Schema (`server/db/init.sql`)

```sql
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_request_id TEXT NOT NULL,
  emotion_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Infrastructure

- Docker Compose: PostgreSQL 16 Alpine (`gemie-postgres`, port 54329→5432)
- Volume: `postgres_data` (persistent)
- Init script: `server/db/init.sql` mounted to `/docker-entrypoint-initdb.d/`

## Environment Variables

| Variable          | Required | Default          | Description                  |
| ----------------- | -------- | ---------------- | ---------------------------- |
| GOOGLE_API_KEY    | Yes      | -                | Gemini API key               |
| GEMINI_TEXT_MODEL | No       | gemini-2.5-flash | Text generation model        |
| DATABASE_URL      | Yes      | -                | PostgreSQL connection string |
| MEMORIES_TABLE    | No       | memories         | Table name                   |
| PORT              | No       | 8787             | Server port                  |

## Dependency Graph

```
index.ts
├── env.ts (parseServerEnv)
├── schemas.ts (validation)
├── postgresService.ts (postgres library)
└── memorySummaryService.ts (@google/genai)
```

## Frontend ↔ Server Integration

- Vite dev server proxies `/api` → `http://localhost:8787`
- Frontend `memoryApiClient.ts` consumes the REST API
