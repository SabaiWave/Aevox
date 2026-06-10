---
name: audit-backend
description: Audit all src/ and app/api/ files against CLAUDE.md and rules/ conventions — flags architecture violations, singleton patterns, forbidden imports, and auth mistakes. Report only — never fixes. Pair with /audit-ui for full compliance check.
---

Read CLAUDE.md and all files in rules/ before starting.

Scan every .ts and .tsx file in src/ and app/api/
(excluding node_modules, .next, generated files, fixtures, and test files).

Check each file against conventions in CLAUDE.md and rules/api.md, rules/database.md, rules/testing.md.

SINGLETON VIOLATIONS — module-level instantiation forbidden:
- createClient() called at module level (Supabase, Stripe, or any SDK)
- Any SDK initialized with env vars outside a lazy getter function
- Pattern to flag: any `const x = createX(process.env.*)` at module top level
- Correct pattern: lazy getter function with `if (!client) client = createX(...)`

AGENT VIOLATIONS — pure TypeScript boundary:
- Any Next.js import inside src/agents/ (next/headers, next/navigation, NextRequest, etc.)
- Any agent function that throws instead of returning AgentResult with status: 'failed'
- Any agent missing confidence, gaps, or sourceUrls fields on its output
- Any agent making API calls without a DRY_RUN check first

FAILURE HANDLING VIOLATIONS:
- Promise.all used instead of Promise.allSettled in orchestrator
- Any catch block that rethrows or lets errors propagate out of an agent
- Missing buildDegradedContext() or equivalent gap message generation

AUTH VIOLATIONS:
- auth.protect() called inside an API route — must use isApiRoute() check first
- middleware.ts present — must be proxy.ts (Next.js 16 convention)

DRY_RUN VIOLATIONS:
- Any agent making external API calls without checking DRY_RUN first
- DRY_RUN check at route level instead of agent level
- Supabase saves skipped when DRY_RUN=true — saves must still run

ENV VAR VIOLATIONS:
- Any hardcoded API key, secret, or credential in any file
- process.env access outside of lazy getters or next.config.ts validation block

PROMPT VIOLATIONS:
- Any LLM response parsed with JSON.parse without going through parseJSON.ts first
- Any agent prompt missing confidence calibration

Output format:

## Backend Audit — [date]

### VIOLATIONS (fix before continuing)
[file path]:[line approx] — [rule violated] — [description]

### WARNINGS (review before phase complete)
[file path]:[line approx] — [description]

### PASS
[X] files scanned. [Y] violations. [Z] warnings.

Rules:
- File path and line number for every finding.
- Do not fix anything. Report only. Wait for instruction.
- Skip src/__fixtures__/, src/__tests__/, and any generated files.

State: "Backend audit complete. X violations found. Ready for fixes or continue?"

If violations found, append:
---
Fix violations before phase marked complete.
Tell me "fix violations" and I'll work through them one by one.
Run /audit-backend again after fixes to confirm clean.
If fixes made: /checkpoint to log what changed.
If pattern worth preventing in future: /improve after /checkpoint.
---
