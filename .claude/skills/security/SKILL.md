# Security Skill — SBW Prevention Rules

Prevention rules for writing secure code in the SBW stack. Apply while writing code.
For post-facto auditing of an existing codebase, use `/security-review`.

## Auth (Clerk v7)

- Call `isApiRoute()` before `auth.protect()` in every API route — never call `auth.protect()` directly inside route handlers.
- Every `/api` route is public until explicitly protected — default deny, not default allow.
- Never derive auth state from client-side cookies or localStorage — use Clerk's `useAuth()` (client) or `auth()` (server) only.
- Admin routes: verify `ADMIN_USER_ID` inside the route handler on every request, not only in middleware. Two layers required.

## Supabase RLS

- Every `CREATE TABLE` migration must include these two lines before the migration ships:
  ```sql
  ALTER TABLE [name] ENABLE ROW LEVEL SECURITY;
  -- plus at least one CREATE POLICY
  ```
- Never import or reference the Supabase service role key in any client-side file — service role bypasses RLS silently and cannot be scoped per-user.
- Rule: anon key client-side only. Service role server-side routes only.

## Input Sanitization

- Validate all API route inputs with Zod at the route boundary before any logic runs — no exceptions.
- Freeform text going to LLM: strip control characters (`\x00-\x1F` except `\n\t`), enforce max 500 chars at the route level.
- XML-delimited prompts: strip `<>` from all user-supplied fields before insertion — short fields can still inject closing tags.
- Sanitize before passing to prompt builders, not inside them.

## Secrets

- All API keys and credentials via `process.env` — never inline string literals in code or config files.
- Never use `NEXT_PUBLIC_` prefix for any secret — all `NEXT_PUBLIC_` vars are bundled into client JS.
- Never log env var values — log key names only (e.g. `"STRIPE_KEY missing"`, never the value itself).

## Rate Limiting

- Apply rate limiter as the first operation in every public-facing API route, before auth or business logic.
- Authenticated routes: rate limit by `userId`. Unauthenticated routes: by IP.
- Return 429 with `Retry-After` header — never silently drop requests.

## SSE / Streaming

- Verify auth before opening any SSE stream — streams are long-lived and cannot be cleanly revoked mid-flight.
- Validate `Origin` header on SSE endpoints in production to block cross-origin stream hijacking.
- Never include raw tokens, internal IDs, or sensitive state in streamed event payloads.
