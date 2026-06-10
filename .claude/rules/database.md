---
paths:
  - "src/lib/supabase.ts"
  - "src/lib/*.ts"
  - "supabase/migrations/**/*.sql"
---

> Before any database work, apply `.claude/skills/karpathy-skills/SKILL.md` guardrails: no silent assumptions, surgical changes only, define verifiable success criteria first.
> Security: re-read `.claude/skills/security/SKILL.md` before writing migrations or Supabase queries — RLS and service role key rules apply.

# Database rules

## Supabase client
- Singleton via lazy getter only. Never module-level instantiation.
- Pattern: if (!client) client = createClient(...)
- One client instance per process. Never create multiple.

## Migrations
- Filename: YYYYMMDD_short_description.sql
- Every new table: RLS enabled + at least one policy.
- Every foreign key: indexed.
- Never DROP TABLE or DROP COLUMN without explicit confirmation.
- Never ALTER COLUMN in a way that loses data.
- Every migration is additive where possible.

## RLS policies
- Authenticated users access only their own rows unless explicitly shared.
- Service role used only in server-side routes, never client-side.
- Test RLS policies in Supabase dashboard before shipping.

## Query patterns
- Use typed Supabase client — never raw SQL strings in application code.
- Use .select() with explicit column list — never select *.
- Paginate all list queries — no unbounded fetches.

## Soft deletes
- Prefer deleted_at timestamp over hard deletes for user data.
- Filter deleted_at IS NULL in all standard queries.

## Transactions
- Use Supabase RPC for multi-step operations requiring atomicity.
- Never assume two sequential .insert() calls are atomic.
