---
paths:
  - "src/__tests__/**/*.ts"
  - "src/__fixtures__/**/*.json"
  - "*.test.ts"
  - "*.test.tsx"
  - "src/lib/**/*.ts"
  - "src/agents/**/*.ts"
  - "app/api/**/*.ts"
---

# Testing rules

## Framework
- Jest for all unit and integration tests.
- No Vitest. No Mocha.

## File locations
- Unit tests: src/__tests__/[module]/[file].test.ts
- Integration tests: src/__tests__/[feature].test.ts
- Fixtures: src/__fixtures__/[category]/[name].json

## Test structure
- One test file per source file for units.
- describe() block per function or class.
- it() descriptions: plain English, no "should".

## Mocking
- Mock Supabase, Stripe, Anthropic, and Tavily — never call real endpoints.
- Use jest.mock() for module-level mocks.
- Use existing fixtures before creating new ones.
- DRY_RUN=true in beforeAll for any test touching agents.

## Agent tests must verify
- Returns AgentResult shape: status, confidence, gaps, sourceUrls
- Returns status: 'failed' on error — never throws
- Respects DRY_RUN=true

## Coverage expectations
- All src/lib/ functions: unit tested.
- All src/agents/: unit tested with DRY_RUN=true.
- All API routes: integration tested (auth + happy path + error path).
- New migrations: tested via Supabase local instance where possible.

## Running tests
- npm test — full suite
- npm test -- [path] — single file
- All tests must pass before /ship-phase

## Test coverage after logic changes
- After editing any logic file (src/lib/, src/agents/, app/api/): assess whether the change requires new or updated tests.
- If yes, write them before marking the task done.
- After writing new or updated tests: run `npm test -- [affected-file]` immediately to verify.
