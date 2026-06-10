If CLAUDE.md contains "mode: template": template mode.
Read `.claude/rules/template-mode.md` — follow the /spec section, then stop.

Reads `brief.md` from the project root and generates all 4 spec files in one pass, then creates satellite doc stubs.

---

## Step 1: Confirm brief.md exists

Check for `brief.md` in the project root.

If missing, stop with:
> "brief.md not found. Copy `.claude/templates/brief.md` to this project's root, fill it in, then run /spec."

Read `brief.md` in full before proceeding.

---

## Step 2: Stitch gate

Check the `**Stitch export:**` field in the Design section of brief.md.

- Value is "Not done yet", empty, or any "not provided" variant → **STITCH_ABSENT = true**. Proceed — do not stop.
- A Stitch export or screenshots path is present → **STITCH_ABSENT = false**. Use it as the primary source for DESIGN.md's visual tokens.

---

## Step 3: Generate CLAUDE.md

Generate from brief.md fields: Product (name, tagline, problem, type, model), Scope (in/out), Stack (standard + deviations + additional APIs), Architecture (pattern, execution flow, agents, folder structure deviations).

**Hard cap: ≤50 lines.** Never include env vars, conventions, gotchas, or implementation memory.

Structure:

```markdown
# CLAUDE.md — [Product Name]

## Product
[Name — tagline. Type. Model. 3–5 lines total.]

## Scope
**In (MVP):**
- [Feature list from brief]

**Out:**
- [Exclusions from brief]

## Stack
[Standard SBW: Next.js App Router, TypeScript, Anthropic SDK, Supabase, Clerk, Stripe, Vercel]
[Deviations: list if any | None]
[Additional APIs: list if any | None]

## Folder Structure
[Derive from stack + architecture pattern + Folder structure deviations field. List top-level directories only.]

## Architecture
**Pattern:** [from brief]
**Execution flow:** [from brief — numbered steps]
[Agents table if multi-agent pipeline; omit if not applicable]

## Commands
npm run dev
npm run build
npm run lint
npm test

## References
- Phases: PHASES.md
- UI system: DESIGN.md
- Coding conventions: .claude/rules/
```

Verify line count ≤50 after writing. If over, trim prose — never cut sections.

---

## Step 4: Generate PHASES.md

Generate from: Scope (in/out), Architecture (pattern, agents), Pricing (tier gating informs phase order), Business Context (launch target, phase count), Phase hints.

**SBW default phase ordering** (use when Phase hints says "None"):
1. Auth + base shell
2. Data model + database
3. Core feature(s)
4. Payments / Stripe integration (if in scope)
5. Polish + launch prep

Adjust for Phase hints when present (e.g. "auth before data model" — default, no change; "Stripe in Phase 1" — move payments up).

Each phase gets:
- Goal (one sentence)
- Key deliverables (bullet list)
- Definition of Done (concrete, verifiable checklist items — use `- [ ]`)

Include a bootstrap prompt for Phase 1 as a blockquote — the exact instruction Claude Code follows to start that phase.

Do NOT include a changelog section.

Structure:

```markdown
# PHASES.md — [Product Name]

## Phase 1: [Name]

**Goal:** [one sentence]

**Deliverables:**
- [...]

**Definition of Done:**
- [ ] [verifiable item]

**Bootstrap prompt:**
> [Exact instruction for starting Phase 1]

---

## Phase 2: [Name]

[...]
```

---

## Step 5: Generate DESIGN.md

DESIGN.md follows the [Google Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/format/): YAML frontmatter carrying machine-readable design tokens, followed by a markdown body with exactly six sections in fixed order.

**If STITCH_ABSENT = true**, open the file with this warning block before the frontmatter:

```markdown
<!--
⚠ STITCH EXPORT NOT PROVIDED
Tokens in this file are derived from brief.md fields only.
After completing Stitch, re-run `sbw-design audit mode` to replace this section with real visual decisions.
-->
```

### YAML frontmatter

Derive from brief.md Design section. Use hex values.

Typography stack mapping (from brief field):
- `Data/intelligence` → display: Space Grotesk, body: Geist, mono: JetBrains Mono
- `Consumer` → display: Plus Jakarta Sans, body: Inter, mono: JetBrains Mono
- `Developer` → display: IBM Plex Sans, body: IBM Plex Sans, mono: IBM Plex Mono
- `Custom` → use specified fonts

```yaml
---
name: [Product Name]
description: [Tagline from brief]
colors:
  primary: "[Primary hex from brief]"
  accent: "[Accent hex from brief]"
  # tertiary: "[Tertiary hex]" — include only if specified and not "none"
  # neutral entries derived from mode (dark/light default)
typography:
  display:
    fontFamily: "[Display font], [fallback]"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: [600 or 700]
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "[Body font], system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "[Body font], system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "64px"
---
```

### Markdown body — six sections, exact headers, fixed order

**Do not rename sections. Do not add extra top-level sections.**

#### `## 1. Overview`

`**Creative North Star: "[Named metaphor]"**`

2–3 paragraphs: personality, density, aesthetic philosophy. Derive character from Aesthetic direction + Feel tags from brief. State what this system explicitly rejects (from "Never in this UI" in brief).

End with `**Key Characteristics:**` bullet list (4–6 items).

#### `## 2. Colors`

Describe palette character in one sentence. Then:

- `### Primary` — describe hex from brief, where and why it's used
- `### Secondary` / `### Tertiary` — only if specified in brief; omit if not
- `### Neutral` — derive from Mode field (dark/light default)

Include at least one `**The [Name] Rule.**` for accent usage (e.g. "The One Voice Rule. Accent appears on ≤10% of any given screen.").

#### `## 3. Typography`

Lead with font family declarations. Character description (1–2 sentences). Then a Hierarchy section listing: Display, Headline, Title, Body, Label — each with weight, size, line-height, and where it appears.

Include at least one Named Rule on type use.

#### `## 4. Elevation`

One paragraph: does this system use shadows, tonal layering, or flat surfaces? Derive from Feel tags:
- `trust-forward` / `calm authority` / `technical precision` → flat by default, tonal layering
- `premium` → ambient shadows, layered
- `friendly/fast` → minimal shadows, mostly flat

If shadows: Shadow Vocabulary list with exact `box-shadow` values and when to use.

#### `## 5. Components`

For each component: character line, then shape/color/states/behavior. Always include: Buttons, Inputs/Fields, Cards/Containers, Navigation. Also include any domain-specific components from the "Domain-specific components" field in brief.

If STITCH_ABSENT = true, derive component styles from the frontmatter tokens using SBW best practices.

#### `## 6. Do's and Don'ts`

Concrete, forceful. Every item from "Never in this UI" in brief must appear as a "Don't." Add SBW standard Don'ts (no gradient text, no glassmorphism by default, no side-stripe borders, no identical card grids).

---

## Step 6: Generate PRODUCT.md

Generate after DESIGN.md. PRODUCT.md is the impeccable-ready strategic digest.

Register: `product` for app/dashboard/tool; `brand` for marketing/landing. Derive from Product Type in brief.

```markdown
# Product

## Register
[product | brand]

## Users
[Synthesize from ICP: Who, Context, Pain, Today — 2–4 sentences]

## Product Purpose
[Synthesize from Product section: name, problem, output, why it exists, what success looks like — 2–3 sentences]

## Brand Personality
[Derive from Design section — Aesthetic direction + Feel tags. Write as: voice/tone description + 3-word personality + emotional goal]

## Anti-references
[Derive from "Never in this UI" list. Phrase as: what this should NOT look like or feel like. Be specific — named patterns, not adjectives.]

## Design Principles
[3–5 principles derived from Core Value Prop + Design section + product type.
Principles, not visual rules. Examples: "trust before friction", "intelligence should be visible", "earn the upgrade", "speed is the feature".
NOT: "use OKLCH", "avoid glassmorphism".]

## Accessibility & Inclusion
[Default: WCAG AA. Note any accessibility-relevant constraints from Business Context.]
```

---

## Step 7: Create satellite doc stubs

After all 4 spec files are generated, create these 3 files in `docs/`. Do not overwrite if they already exist.

**`docs/env-vars.md`:**
```markdown
# Environment Variables

> Maintained by Claude Code. Updated as env vars are introduced during build.
> Never commit actual values — reference only.

| Variable | Purpose | Phase introduced | Required |
|----------|---------|-----------------|----------|
| | | | |
```

**`docs/decisions.md`:**
```markdown
# Architectural Decisions

> Maintained by Claude Code. Log key decisions and rationale here.
> Prevents relitigating settled decisions across sessions.

## Template

**Decision:** [What was decided]
**Why:** [Rationale — one sentence]
**Alternatives rejected:** [What else was considered and why it lost]
**Phase:** [When this was decided]
```

**`docs/build-notes.md`:**
```markdown
# Build Notes

> Maintained by Claude Code. Gotchas, dead-ends, and quirks discovered during build.
> Not a spec file — not source of truth. Just institutional memory.

## Template

**Note:** [What to know]
**Context:** [Why it matters or how it was discovered]
**Phase:** [When discovered]
```

---

## Step 8: Output completion summary

```
✅ /spec complete

Generated:
- CLAUDE.md ([N] lines)
- PHASES.md ([N] phases)
- DESIGN.md[⚠ Stitch tokens pending — fill in after Stitch export]
- PRODUCT.md

Created:
- docs/env-vars.md
- docs/decisions.md
- docs/build-notes.md

Next: run /start to begin Phase 1.
```

Omit the ⚠ annotation from DESIGN.md line if STITCH_ABSENT = false.
