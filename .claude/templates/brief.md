# brief.md — [Product Name]

> This file is the single input for `/spec`.
> Complete every section before running `/spec`.
> Claude Code reads this once and generates CLAUDE.md, PHASES.md, DESIGN.md, PRODUCT.md.
> Do not leave placeholders. If unknown, make a decision and note it.

---

## Product

**Name:** [Product name]
**Tagline:** [One sentence — what it does and for whom]
**Problem:** [2–3 sentences — who has it, what they're doing today, why it's painful]
**Output:** [What the user gets — a report, a dashboard, an action, a file]
**Type:** [Data/intelligence tool | Consumer app | Developer tool | Marketplace | Other]
**Model:** [B2C | B2B | Both]

---

## ICP

**Who:** [Job title, lifestyle, or archetype]
**Context:** [Where are they, what are they trying to do]
**Pain:** [The specific friction this product removes]
**Today:** [How they solve this without the product — manual process, competitor, nothing]

---

## Core Value Prop

[One paragraph. What makes this different. What it does that nothing else does.]

---

## Architecture

**Pattern:** [Multi-agent pipeline | Standard CRUD SaaS | Other — describe]

**Agents:** (if applicable)
| Agent | What it does | Tools |
|-------|-------------|-------|
| [Name] | [Purpose] | [Tavily | API | Scraper | Other] |

**Execution flow:** [Numbered steps — user input → processing → output. Include SSE if streaming.]

**Non-standard patterns:** [SSE streaming | Background jobs | Polling | Webhooks | None]

**Folder structure deviations:** [Any non-standard directories — /workers, /agents, /lib/queue, etc. | None]

---

## Stack

**Standard SBW:** Next.js App Router, TypeScript, Anthropic SDK, Supabase, Clerk, Stripe, Vercel
**Deviations:** [List any swaps or additions. None if standard.]
**Additional APIs:** [Tavily | Other external APIs | None]

---

## Scope

**In (MVP):**
- [Feature 1]
- [Feature 2]

**Out (explicit exclusions):**
- [Not building X]
- [Not building Y]

**Phase hints:** [Any non-default phase ordering, emphasis, or constraints — e.g. "auth before data model", "Stripe in Phase 1 not Phase 3" | None — use SBW defaults]

---

## Data Model

**Key entities:**
| Entity | Key fields | Relationships |
|--------|-----------|---------------|
| [Name] | [Fields] | [Belongs to / has many] |

---

## Pricing

**Model:** [Free tier + paid | Subscription | One-time | Usage-based]
**Tiers:** [List tiers with price and what each unlocks]
**Free limits:** [What free users can do and where the wall is]

---

## Design

**Stitch export:** [Paste export content here | Path to screenshots | Not done yet — /spec will proceed with derived tokens and flag sections for replacement]

**Aesthetic direction:** [2–3 sentences. What it should feel like. Reference points if helpful.]
**Feel:** [Pick all that fit: trust-forward | calm authority | friendly/fast | premium | technical precision]
**Mode:** [Dark default | Light default | Both]

**Colors:**
- Primary (buttons, nav, active states): [Hex or "SBW default navy #1e3a5f"]
- Accent (urgency, CTAs only): [Hex or "SBW default amber #f59e0b"]
- Tertiary (AI/ML features only, optional): [Hex or "none"]

**Typography:**
- Stack: [Data/intelligence → Space Grotesk + Geist + JetBrains Mono | Consumer → Plus Jakarta Sans + Inter + JetBrains Mono | Developer → IBM Plex Sans + IBM Plex Mono | Custom — specify]

**Key screens:**
- [/route — description]
- [/route — description]

**Domain-specific components:** [Any unique UI patterns — agent rows, confidence badges, timeline, etc.]

**Never in this UI:**
- [Anti-pattern 1]
- [Anti-pattern 2]

---

## Business Context

**B2B / white-label:** [Yes — config/client.ts pattern | No]
**Launch target:** [Phase count or rough date]
**Known constraints:** [Legal, compliance, API limits, anything that affects architecture]

---

## Notes

[Anything that doesn't fit above — decisions made, tradeoffs accepted, open questions]
