# Contributing Guide

> Auto-generated from `package.json` and `.env.example` (source of truth).

## Prerequisites

- [Bun](https://bun.sh/) (latest)
- Node.js 20+
- Docker (for PostgreSQL)

## Environment Setup

1. Clone the repository and install dependencies:

```bash
bun install
```

2. Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Environment Variables

| Variable                 | Required | Default                                              | Description                          |
| ------------------------ | -------- | ---------------------------------------------------- | ------------------------------------ |
| `VITE_GOOGLE_API_KEY`    | Yes      | -                                                    | Google API key for frontend (Gemini) |
| `VITE_GEMINI_LIVE_MODEL` | No       | `gemini-2.5-flash-native-audio-preview-12-2025`      | Gemini Live model ID                 |
| `VITE_GEMINI_TEXT_MODEL` | No       | `gemini-2.5-flash`                                   | Gemini text model ID                 |
| `VITE_API_BASE_URL`      | No       | `/api`                                               | API base URL for frontend            |
| `GOOGLE_API_KEY`         | Yes      | -                                                    | Google API key for server-side       |
| `DATABASE_URL`           | Yes      | `postgres://postgres:postgres@localhost:54329/gemie` | PostgreSQL connection string         |
| `MEMORIES_TABLE`         | No       | `memories`                                           | Database table name for memories     |
| `PORT`                   | No       | `8787`                                               | Server port                          |

3. Start the database:

```bash
bun run db:up
```

## Available Scripts

| Script          | Command                                                        | Description                         |
| --------------- | -------------------------------------------------------------- | ----------------------------------- |
| `dev`           | `vite --host`                                                  | Start Vite dev server (frontend)    |
| `dev:server`    | `bun --watch server/src/index.ts`                              | Start API server with hot-reload    |
| `db:up`         | `docker compose up -d postgres`                                | Start PostgreSQL container          |
| `db:down`       | `docker compose down`                                          | Stop Docker containers              |
| `build`         | `tsc && vite build`                                            | Type-check and build for production |
| `preview`       | `vite preview --host`                                          | Preview production build            |
| `start:server`  | `bun server/src/index.ts`                                      | Start API server (production)       |
| `typecheck`     | `tsc --noEmit`                                                 | Run TypeScript type checking        |
| `lint`          | `eslint . --ext .ts`                                           | Run ESLint                          |
| `lint:fix`      | `eslint . --ext .ts --fix`                                     | Run ESLint with auto-fix            |
| `format`        | `prettier . --write`                                           | Format code with Prettier           |
| `format:check`  | `prettier . --check`                                           | Check code formatting               |
| `test`          | `vitest run`                                                   | Run tests once                      |
| `test:live-llm` | `LIVE_LLM_TEST=1 vitest run tests/liveLLM.integration.test.ts` | Run live LLM integration tests      |
| `test:watch`    | `vitest`                                                       | Run tests in watch mode             |
| `test:coverage` | `vitest run --coverage`                                        | Run tests with coverage report      |
| `check`         | `format:check + lint + typecheck + test:coverage`              | Full quality gate (CI)              |

## Development Workflow

1. Create a feature branch from `main`
2. Write tests first (TDD) - see `docs/testing-strategy.md`
3. Implement the feature
4. Run the full quality gate before pushing:

```bash
bun run check
```

5. Open a Pull Request

## Testing

- Test framework: **Vitest**
- Coverage provider: **v8**
- Minimum coverage: **80%** (lines, functions, branches, statements)
- Coverage targets (Phase 1): `src/gameEngine.ts`, `src/geminiJudge.ts`, `src/config.ts`
- Test files: `tests/*.test.ts`

```bash
bun run test            # Run all tests
bun run test:watch      # Watch mode
bun run test:coverage   # With coverage report
```

## CI

PR and `main` push trigger `.github/workflows/ci.yml`, which runs `bun run check`. All checks must pass (Hard Gate).
