---
paths:
  - "app/api/**/*.ts"
  - "src/agents/**/*.ts"
  - "src/orchestrator.ts"
---

> Before any backend work, apply `.claude/skills/karpathy-skills/SKILL.md` guardrails: no silent assumptions, surgical changes only, define verifiable success criteria first.
> Security: re-read `.claude/skills/security/SKILL.md` before writing any route, auth check, or input handler.

# API rules

## Route conventions
- Every route file exports only: GET, POST, PUT, DELETE, PATCH (Next.js named exports).
- No business logic in route files — delegate to src/ functions.
- Auth check at the top of every protected route before any logic.

## Auth (Clerk)
- Use isApiRoute() check before auth.protect() in API routes.
- No auth.protect() called directly inside route handlers.
- middleware.ts must not exist — use proxy.ts (Next.js 16).

## Input validation
- Validate ALL inputs with Zod before processing — no exceptions.
- Return 400 with structured error details on validation failure.
- Never trust req.body without parsing and validating.
- Sanitize all freeform text fields before passing to LLM — strip control characters, limit length.
- For freeform inputs going to agents: enforce max character limit (e.g. 500 chars) at route level.
- Never pass raw user input directly into a prompt string without sanitization.

## Rate limiting
- Every public-facing API route must have rate limiting — no exceptions.
- Rate limit by IP for unauthenticated routes.
- Rate limit by userId for authenticated routes.
- Recommended: Upstash Ratelimit + Redis, or in-memory for low-traffic MVP.
- Return 429 with Retry-After header when limit exceeded.
- Free tier routes get stricter limits than paid tier routes.

## Error handling
- API routes never throw unhandled errors to the client.
- Catch all errors, return structured JSON: { error: string, code?: string }.
- Log errors via logger.ts before returning.
- Never expose stack traces or internal error details to the client.

## Agent boundary
- Zero Next.js imports inside src/agents/ or src/orchestrator.ts.
- Agents return AgentResult<T> — never throw.
- All agent calls wrapped in Promise.allSettled — never Promise.all.
- DRY_RUN check required before any Anthropic or external API call.

## Environment variables
- Access env vars only inside lazy getters or next.config.ts validation.
- Never access process.env at module top level.
- All required env vars documented in .env.example.
- Never log env var values — log key names only.

## Response shape
- Success: { data: T, meta?: object }
- Error: { error: string, code?: string }
- Consistent across all routes.

## Security
- No hardcoded secrets, API keys, or credentials anywhere.
- Webhook endpoints must verify signatures before processing (Stripe: stripe.webhooks.constructEvent, Clerk: svix).
- Admin routes must verify ADMIN_USER_ID on every request — not just middleware.
- Never return sensitive fields (tokens, keys, internal IDs) in API responses.
- CORS: restrict origins in production — never wildcard (*) on authenticated routes.
