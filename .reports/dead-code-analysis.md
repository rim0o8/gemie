# Dead Code Analysis Report

**Date:** 2026-02-21
**Scope:** `play/` (Gemini Live API text app) and `reality-quest/` (AR game)
**Method:** Manual static analysis of all source files, cross-referencing imports, exports, and usages

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [play/ Project Findings](#play-project-findings)
3. [reality-quest/ Project Findings](#reality-quest-project-findings)
4. [Cross-Project Duplicate Code](#cross-project-duplicate-code)
5. [Coverage Directories (Build Artifacts)](#coverage-directories)
6. [Missing .gitignore](#missing-gitignore)
7. [Unused Dependencies](#unused-dependencies)
8. [Summary Table](#summary-table)

---

## Executive Summary

Both projects are well-structured with minimal dead code. The codebase is a hackathon project and most code is actively used. The main findings are:

- **1 unused export** in `reality-quest/` (`stopRenderLoop` in `xrRenderer.ts`)
- **1 unused exported type** in `reality-quest/` (`RecoveryAction` in `types.ts`)
- **1 unused exported type** in `reality-quest/` (`UIDeltaFeedback` in `types.ts`)
- **1 unused exported function** in `reality-quest/` (`buildGreetingIllustrationPrompt` in `gemieCharacter.ts`)
- **1 entirely unused source file** in `reality-quest/` (`server/src/supabaseService.ts`)
- **2 coverage directories** that should be gitignored
- **No .gitignore file exists** at the project root or either sub-project
- **Duplicate code patterns** across projects (shared Zod schemas, `normalizeJsonString`)

---

## play/ Project Findings

### Unused Exports

**No unused exports found.** All exported functions and types are consumed:

| Export | Defined In | Consumed By |
|--------|-----------|-------------|
| `loadConfig` | `src/config.ts` | `src/index.ts`, `src/doctorCli.ts`, `tests/config.test.ts` |
| `runDoctor` | `src/doctor.ts` | `src/index.ts`, `src/doctorCli.ts`, `tests/doctor.test.ts` |
| `createLiveConnect` | `src/geminiLiveClient.ts` | `src/index.ts`, `tests/geminiLiveClient.test.ts` |
| `createReadlineIO` | `src/io.ts` | `src/index.ts`, `src/doctorCli.ts`, `tests/io.test.ts` |
| `runLiveTextApp` | `src/liveTextApp.ts` | `src/index.ts`, `tests/liveTextApp.test.ts` |
| All types in `types.ts` | `src/types.ts` | Multiple source and test files |

### Unused Imports

**No unused imports found.** All imports are consumed within their respective files.

### Unused Local Variables / Dead Code Paths

**No dead code paths found.** The `play/` project is clean.

### Unused Dependencies

**No unused dependencies.**

| Dependency | Usage |
|-----------|-------|
| `@google/genai` | `src/geminiLiveClient.ts` |
| `zod` | `src/config.ts`, `src/liveTextApp.ts` |
| `@types/node` | TypeScript type definitions for Node.js APIs |
| `@vitest/coverage-v8` | Coverage provider |
| `typescript` | Compiler |
| `vitest` | Test runner |

### Assessment: play/ is CLEAN

---

## reality-quest/ Project Findings

### F1: Unused Export - `stopRenderLoop` in `src/ar/xrRenderer.ts`

- **Category:** SAFE
- **File:** `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/ar/xrRenderer.ts` (line 52)
- **Export:** `export const stopRenderLoop`
- **Evidence:** Grepped all source and test files for `stopRenderLoop` -- only the definition site references it. No imports found anywhere in the project.
- **Why dead:** The function `stopRenderLoop` calls `renderer.setAnimationLoop(null)` to stop the render loop, but neither `main.ts` nor any other file imports or uses it. The app either runs the render loop forever or stops via XR session end.
- **Risk of removal:** LOW. This is a utility that could be useful for graceful shutdown but is currently unused. It could be called in `teardownRuntimeResources()` if needed, but currently is not.

### F2: Unused Exported Type - `RecoveryAction` in `src/types.ts`

- **Category:** SAFE
- **File:** `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/types.ts` (line 130)
- **Export:** `export type RecoveryAction = 'retry' | 'back_to_menu';`
- **Evidence:** Grepped for `RecoveryAction` across all files -- only the definition in `types.ts` references it. No imports found.
- **Why dead:** This type was likely defined to model error recovery actions in the UI but was never consumed by any component or function.
- **Risk of removal:** LOW. It is a type-only export with no runtime impact.

### F3: Unused Exported Type - `UIDeltaFeedback` in `src/types.ts`

- **Category:** SAFE
- **File:** `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/types.ts` (lines 125-128)
- **Export:** `export type UIDeltaFeedback = { readonly affectionDelta: number; readonly hungerDelta: number; }`
- **Evidence:** Grepped for `UIDeltaFeedback` across all files -- only the definition in `types.ts` references it. No imports found.
- **Why dead:** The stat delta animation is handled directly by `domOverlay.animateStatDelta()` using inline number parameters rather than this structured type.
- **Risk of removal:** LOW. It is a type-only export with no runtime impact.

### F4: Unused Exported Function - `buildGreetingIllustrationPrompt` in `src/gemieCharacter.ts`

- **Category:** CAUTION
- **File:** `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/gemieCharacter.ts` (line 9)
- **Export:** `export const buildGreetingIllustrationPrompt`
- **Evidence:** This function is imported and tested in `tests/gemieCharacter.test.ts`, but it is NOT imported or called anywhere in the production source code (`src/`). Only `buildEmotionIllustrationPrompt` is used in `main.ts`.
- **Why dead:** It generates a greeting illustration prompt for Gemie waving, but the menu screen uses a static image (`/gemie.png`) and video instead of a dynamically generated illustration.
- **Risk of removal:** LOW for production code, but the test file references it. The function may have been intended for a feature that was never wired up (e.g., generating a greeting illustration on app start).

### F5: Entirely Unused Source File - `server/src/supabaseService.ts`

- **Category:** SAFE
- **File:** `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/server/src/supabaseService.ts`
- **Export:** `createSupabaseService` (function with methods: `uploadMemoryImage`, `listMemories`, `insertMemory`, `pickRandomMemory`)
- **Evidence:** Grepped for `supabaseService`, `createSupabaseService`, and `uploadMemoryImage` across the entire project -- no imports found in any file. The server uses `postgresService.ts` instead.
- **Why dead:** This appears to be an earlier implementation that used the Supabase REST API and Storage for memory persistence. It was superseded by `postgresService.ts` which uses the `postgres` npm package for direct database access. The server's `index.ts` imports `createPostgresService`, not `createSupabaseService`.
- **Risk of removal:** LOW. This is a complete alternative implementation that is fully replaced. No test file exists for it either.
- **Additional note:** The Supabase service also references environment variables (`supabaseUrl`, `serviceRoleKey`, `bucketName`) that are not defined in `server/src/env.ts`, further confirming it is abandoned code.

### F6: Unused Export - `setupHitTest` in `src/ar/hitTest.ts` (partially used)

- **Category:** CAUTION
- **File:** `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/ar/hitTest.ts` (line 3)
- **Export:** `export const setupHitTest`
- **Evidence:** This function IS used -- it is imported in `src/ar/xrSession.ts` and mocked in `tests/xrSession.test.ts`. This is NOT dead code.
- **Status:** FALSE POSITIVE -- actively used.

### F7: `GEMIE_CHARACTER_BIBLE` Export Usage

- **Category:** CAUTION
- **File:** `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/gemieCharacter.ts` (line 1)
- **Export:** `export const GEMIE_CHARACTER_BIBLE`
- **Evidence:** Used in `buildGreetingIllustrationPrompt` (which is unused in production) AND in `buildEmotionIllustrationPrompt` (which IS used in `main.ts`). Also referenced in `tests/gemieCharacter.test.ts`.
- **Status:** ACTIVELY USED via `buildEmotionIllustrationPrompt`. Not dead code.

### Unused Imports Within Files

**No unused imports found.** The `tsconfig.json` has `"noUnusedLocals": true` and `"noUnusedParameters": true` enabled, which would cause compilation errors for unused imports.

### Dead Code Paths

**No dead code paths found.** All branches in switch statements and if/else chains are reachable.

---

## Cross-Project Duplicate Code

### D1: `normalizeJsonString` Function (Triplicated)

- **Category:** SAFE (consolidation opportunity)
- **Locations:**
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/geminiJudge.ts` (line 105)
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/reactionRenderer.ts` (line 11)
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/requestGenerator.ts` (line 14)
- **Implementation:** All three are identical:
  ```typescript
  const normalizeJsonString = (text: string): string => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/);
    return jsonMatch?.[1] ?? text.trim();
  };
  ```
- **Recommendation:** Extract to a shared utility module (e.g., `src/utils/jsonParse.ts`). Since these are all within `reality-quest/`, a single shared utility would eliminate the triplication.
- **Risk of consolidation:** LOW. All three implementations are byte-for-byte identical.

### D2: Duplicate Zod Schemas for `SaveMemoryInput` and `MemoryItem`

- **Category:** SAFE (consolidation opportunity)
- **Locations:**
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/memoryApiClient.ts` (lines 4-31) -- defines `saveMemoryInputSchema`, `memoryItemSchema`, plus `memoriesResponseSchema`, `randomMemoryResponseSchema`, `saveMemoryResponseSchema`
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/server/src/schemas.ts` (lines 3-21) -- defines `saveMemoryInputSchema`, `memoryItemSchema`
- **Nature of duplication:** Both files define overlapping Zod schemas for the same data structures. The server version in `schemas.ts` is the source of truth (used by server code), while `memoryApiClient.ts` re-declares them for client-side validation.
- **Recommendation:** Consider sharing the schemas via a shared package or common file. However, since client and server may have different bundling constraints, this duplication may be intentional for hackathon simplicity.
- **Risk of consolidation:** MEDIUM. Client uses Vite bundling, server uses Bun directly. Sharing requires careful import path management.

### D3: Duplicate `SaveMemoryInput` Type Export

- **Category:** SAFE
- **Locations:**
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/memoryApiClient.ts` (line 33): `export type SaveMemoryInput = z.infer<typeof saveMemoryInputSchema>;`
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/server/src/schemas.ts` (line 20): `export type SaveMemoryInput = z.infer<typeof saveMemoryInputSchema>;`
- **Nature:** Both derive the same type from structurally identical Zod schemas. Client code uses the client version, server code uses the server version.
- **Risk:** LOW. Type-level duplication only; no runtime impact.

### D4: Duplicate `MemoryItem` Type

- **Category:** SAFE
- **Locations:**
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/types.ts` (lines 46-53): Manual type definition
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/server/src/schemas.ts` (line 21): `export type MemoryItem = z.infer<typeof memoryItemSchema>;`
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/src/memoryApiClient.ts` (lines 4-11): Zod schema that mirrors the type
- **Nature:** Three representations of the same `MemoryItem` shape across client types, client Zod schema, and server Zod schema.
- **Risk of consolidation:** MEDIUM. Same bundling concern as D2.

---

## Coverage Directories

### C1: Coverage Directories are Build Artifacts

- **Category:** SAFE
- **Directories found:**
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/play/coverage/`
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/coverage/`
- **Issue:** These are generated by `vitest --coverage` and should NOT be committed to version control. They contain HTML reports and V8 coverage data that is machine-specific and changes on every test run.
- **Current state:** No `.gitignore` file exists in the project, so `git status` shows the entire `./` directory as untracked. If/when files are committed, coverage directories would be included unless a `.gitignore` is added.
- **Recommendation:** Add `coverage/` to `.gitignore` at the project root or in each sub-project.

---

## Missing .gitignore

### G1: No .gitignore Exists Anywhere in the Project

- **Category:** SAFE (immediate action recommended)
- **Issue:** There is no `.gitignore` file at:
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/`
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/play/`
  - `/Users/yuri/workspace/Gemini-3-Tokyo-Hackathon/playground/rim0o8/reality-quest/`
- **Risk:** Without a `.gitignore`, the following will be committed if `git add .` is run:
  - `node_modules/` directories
  - `coverage/` directories
  - `.env` files (containing API keys)
  - `.DS_Store` files (macOS metadata, already present)
  - `dist/` build outputs
  - `bun.lockb` (binary lockfiles -- may or may not be desired)
  - `.playwright-mcp/` log files
- **Recommended `.gitignore` entries:**
  ```
  node_modules/
  coverage/
  dist/
  .env
  .env.*
  .DS_Store
  *.log
  .playwright-mcp/
  ```

---

## Unused Dependencies

### play/ Project

**No unused dependencies found.**

| Dependency | Status | Used In |
|-----------|--------|---------|
| `@google/genai` | USED | `src/geminiLiveClient.ts` |
| `zod` | USED | `src/config.ts`, `src/liveTextApp.ts` |

### reality-quest/ Project

**No unused dependencies found.**

| Dependency | Status | Used In |
|-----------|--------|---------|
| `@google/genai` | USED | `src/geminiJudge.ts`, `src/liveNarrator.ts`, `src/reactionRenderer.ts`, `src/requestGenerator.ts`, `server/src/memorySummaryService.ts` |
| `postgres` | USED | `server/src/postgresService.ts` |
| `three` | USED | `src/ar/*.ts`, `src/main.ts` |
| `zod` | USED | `src/config.ts`, `src/stateStore.ts`, `src/memoryApiClient.ts`, `src/geminiJudge.ts`, `src/reactionRenderer.ts`, `src/requestGenerator.ts`, `server/src/env.ts`, `server/src/schemas.ts` |
| `esbuild` | USED | Implicit dependency for Vite build |
| `eslint` | USED | Linting via `eslint.config.mjs` |
| `eslint-config-prettier` | USED | `eslint.config.mjs` |
| `prettier` | USED | Formatting via scripts |
| `typescript-eslint` | USED | `eslint.config.mjs` |
| `vite` | USED | Build tool, `vite.config.ts` |

**Note on `esbuild`:** This is pinned to `0.24.2` as a devDependency. Vite uses esbuild internally for TypeScript/JSX transforms. Explicitly pinning it is sometimes done to avoid version conflicts, though Vite typically bundles its own. This is not dead, but the explicit pin may be unnecessary if Vite's bundled version suffices.

---

## Summary Table

| ID | Type | File | Item | Category | Risk |
|----|------|------|------|----------|------|
| F1 | Unused export | `reality-quest/src/ar/xrRenderer.ts` | `stopRenderLoop` | SAFE | LOW |
| F2 | Unused type | `reality-quest/src/types.ts` | `RecoveryAction` | SAFE | LOW |
| F3 | Unused type | `reality-quest/src/types.ts` | `UIDeltaFeedback` | SAFE | LOW |
| F4 | Unused function (production) | `reality-quest/src/gemieCharacter.ts` | `buildGreetingIllustrationPrompt` | CAUTION | LOW |
| F5 | Unused file | `reality-quest/server/src/supabaseService.ts` | Entire file | SAFE | LOW |
| D1 | Triplicated code | 3 files in `reality-quest/src/` | `normalizeJsonString` | SAFE | LOW |
| D2 | Duplicate schemas | `memoryApiClient.ts` + `server/schemas.ts` | Zod schemas | SAFE | MEDIUM |
| D3 | Duplicate type | `memoryApiClient.ts` + `server/schemas.ts` | `SaveMemoryInput` | SAFE | LOW |
| D4 | Duplicate type | `types.ts` + `memoryApiClient.ts` + `server/schemas.ts` | `MemoryItem` | SAFE | MEDIUM |
| C1 | Build artifacts | `play/coverage/`, `reality-quest/coverage/` | Coverage output | SAFE | LOW |
| G1 | Missing config | Project root | `.gitignore` | SAFE | LOW |

---

## Findings NOT Included (Verified as Actively Used)

The following items were investigated and confirmed to be actively used:

- **`src/quests.ts` (`SEED_REQUESTS`):** Used in `requestGenerator.ts` and tested in `tests/requestGenerator.test.ts`
- **`src/ar/hitTest.ts` (`setupHitTest`, `getHitTestResult`, `createReticle`):** All three exports used in `main.ts` and/or `xrSession.ts`
- **`src/ar/iosCameraAR.ts` (`IOSARSession`, `startIOSCameraAR`, `isWebXRARSupported`):** All used in `main.ts`
- **`src/ar/xrRenderer.ts` (`createXRRenderer`, `createARButton`, `startRenderLoop`):** All used in `main.ts`
- **`src/ar/xrSession.ts` (all exports):** Used in `main.ts` and tested
- **`src/ar/arEffects.ts` (`playAREffect`):** Used in `main.ts`
- **`src/camera/captureFrame.ts` (all exports):** Used in `main.ts`, `iosCameraAR.ts`, and tested
- **`src/stateStore.ts` (`createStateStore`, `StateStore`):** Used in `main.ts` and tested
- **`src/gameEngine.ts` (`transition`, `isCapturePhase`):** Used in `main.ts` and tested
- **`src/jemieAgent.ts` (all exports):** Used in `gameEngine.ts`, `stateStore.ts`, and tests
- **`src/geminiJudge.ts` (`createGeminiJudge`, `parseJudgeResult`):** Used in `main.ts` and tested
- **`src/liveNarrator.ts` (`createLiveNarrator`):** Used in `main.ts` and tested
- **`src/memoryApiClient.ts` (`createMemoryApiClient` and types):** Used in `main.ts` and tested
- **`src/reactionRenderer.ts` (`createReactionRenderer`, `createGeminiReactionRenderer`, `parseReactionResponse`):** Used in `main.ts` and tested
- **`src/requestGenerator.ts` (`createRequestGenerator`, `createGeminiRequestGenerator`, `parseRequestResponse`):** Used in `main.ts` and tested
- **`src/illustrationService.ts` (`createIllustrationService`):** Used in `main.ts` and tested
- **`src/gemieVoiceChat.ts` (`createGemieVoiceChat`, `GemieVoiceChat`):** Used in `main.ts`
- **`src/ui/domOverlay.ts` (all exports):** Used in `src/ui/gameUI.ts` and tested
- **`src/ui/gameUI.ts` (`initUI`, `updateUI`):** Used in `main.ts` and tested
- **`src/ui/uiPhaseModel.ts` (`getUIPhaseModel`, `UIPhaseModel`, `UIStatusTone`):** Used in `gameUI.ts` and tested
- **`server/src/env.ts` (`parseServerEnv`, `ServerEnv`):** Used in `server/src/index.ts`
- **`server/src/schemas.ts` (all exports):** Used in `server/src/index.ts` and `server/src/memorySummaryService.ts`
- **`server/src/postgresService.ts` (`createPostgresService`):** Used in `server/src/index.ts`
- **`server/src/memorySummaryService.ts` (`createMemorySummaryService`):** Used in `server/src/index.ts`
- **`play/src/doctorCli.ts`:** Entry point via `bun run doctor` script

---

## Recommended Actions (Priority Order)

### Immediate (No risk)
1. Add a `.gitignore` file to prevent committing `node_modules/`, `coverage/`, `.env`, `.DS_Store`, and `dist/`
2. Remove `server/src/supabaseService.ts` -- fully replaced by `postgresService.ts`, no references anywhere

### Low Risk
3. Remove `stopRenderLoop` export from `src/ar/xrRenderer.ts` or keep it for potential future use
4. Remove `RecoveryAction` and `UIDeltaFeedback` types from `src/types.ts`
5. Decide whether `buildGreetingIllustrationPrompt` should be wired up to a feature or removed

### Code Quality
6. Extract `normalizeJsonString` to a shared utility to eliminate triple duplication
7. Consider whether client/server Zod schema duplication can be reduced via a shared definitions file

---

## Methodology Notes

- All source files were read in full (no `node_modules`, no binary files)
- Each exported symbol was traced to its import sites across the entire project
- TypeScript compiler flags (`noUnusedLocals`, `noUnusedParameters`) provide additional safety -- the reality-quest project has these enabled, which means local unused variables/parameters would cause build errors
- The play/ project does NOT have `noUnusedLocals`/`noUnusedParameters` in its `tsconfig.json`, but no unused locals were found through manual inspection
- Dynamic imports (`import()`) were checked -- none exist in either project
- String-based references (e.g., `require()`) were checked -- none exist in either project (both use ESM)
