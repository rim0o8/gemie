# Codex Setup

## Prerequisites

- bun
- Node.js 20+

## Install

```bash
bun install
```

## Quality Gate Commands

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test:coverage
bun run check
```

## CI

- `.github/workflows/ci.yml` で PR / main push のたびに `bun run check` を実行
- どれか1つでも失敗すると CI 失敗（Hard Gate）

## Runtime Environment Variables

- `VITE_GOOGLE_API_KEY` (required)
- `VITE_GEMINI_LIVE_MODEL` (optional, default: `gemini-2.0-flash-live-001`)

`src/config.ts` で Zod による検証を実施し、無効な値は起動時にエラー化する。
