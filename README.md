# Aevox

A config-driven content pipeline that turns a topic into a publish-ready voiceover and research package in under 30 minutes.

Built for solo faceless YouTube creators. One topic input → research + script + voice + auto-publish to YouTube.

---

## What it does

1. **Research** — Tavily scrapes and structures a source package for your topic
2. **Script** — Claude writes a channel-tuned script from the research
3. **Voice** — ElevenLabs synthesizes an MP3 narration
4. **Publish** — YouTube Data API uploads the video with metadata

Every step is driven by a **channel config** — tone, source types, script structure, forbidden topics, voice ID, YouTube defaults. Swap the config, get a different channel's content. No code changes.

---

## Stack

- **Framework:** Next.js App Router + TypeScript
- **Auth:** Clerk v7
- **Database:** Supabase (Postgres + Storage)
- **Billing:** Stripe
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) + ElevenLabs + Tavily
- **Publish:** YouTube Data API v3 (per-user OAuth 2.0)
- **Infra:** Vercel
- **Observability:** Sentry + BetterStack
- **Testing:** Jest

---

## Key concepts

**Channel config** — the core primitive. Defines niche, tone, script structure, voice, and YouTube defaults. One config = one channel identity. Pre-loaded with `DarkLore` (SE Asia folklore) as the demo.

**Pipeline run** — one end-to-end execution: Research → Script → Voice → Publish. Streamed live via SSE. Each stage returns `AgentResult<T>` — never throws. Failed stages produce degraded output, not a crash.

**DRY_RUN=true** — skips all external API calls (Anthropic, Tavily, ElevenLabs, YouTube) but Supabase saves still run. Use in dev to test pipeline flow without burning credits.

---

## Pricing

| Tier    | Price  | Configs | Videos/mo |
| ------- | ------ | ------- | --------- |
| Starter | $49/mo | 1       | 8         |
| Pro     | $99/mo | 3       | Unlimited |

Free tier: 2 pipeline runs, no card required.

---

## Dev

```bash
npm run dev
npm run build
npm run lint
npm test
```

---

## Notes
