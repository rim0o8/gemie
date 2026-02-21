# Testing Strategy

## Coverage Policy

- Minimum coverage: 80%
- Hard Gate: CI failure when thresholds are not met

## Phase 1 (Current)

- Coverage include:
  - `src/gameEngine.ts`
  - `src/geminiJudge.ts`
  - `src/config.ts`
- Goal: lock logic-layer quality first

## Phase 2 (Next)

- Expand include target to `src/**/*.ts`
- Add mocks/stubs for WebXR, MediaDevices, and DOM-heavy modules
- Maintain thresholds at 80% across all metrics

## TDD Rule

- Add or update tests first
- Implement after red tests are confirmed
- Keep regression tests for bug fixes
