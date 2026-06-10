---
name: checkpoint
description: Save session state — writes to sessions/checkpoint-[slug].md, logs friction, updates PHASES.md. Safe to run mid-session before token compaction.
---

Create sessions/ directory if it doesn't exist.

SLUG GENERATION — do this first:
Derive a short slug from what was worked on this session.
Rules: lowercase, hyphens only, 2-4 words max.
Examples: dashboard-qa, stripe-webhooks, phase-9-cost, auth-setup
Filename: sessions/checkpoint-[slug].md
Re-running in the same thread overwrites — that's intended.

---

CONTEXT DETECTION:

If CLAUDE.md contains "mode: template": template mode.
Read `.claude/rules/template-mode.md` — follow the /checkpoint section, then stop.

Check PHASES.md — are there any unchecked phases?

- YES (unchecked phases exist): PHASE MODE
- NO (all phases checked): POST-LAUNCH MODE

---

PHASE MODE:

Pre-write checks (run before writing the file):

**Changed files precheck:**
Run `git status --short` to list all modified, staged, and new files this session.
Gate expensive checks using this list:
- Docs sweep: skip if no files outside `.claude/` changed
- README sync: skip if no changes to `.claude/commands/`, `.claude/agents/`, `.claude/skills/`, or `README.md`

All other checks (admin route, env, dep, spec, content) remain conditional on their existing triggers.

**Admin route check:**
Was a new /api/admin/\* route created this session?

- YES: confirm a corresponding UI action exists in the /admin page.
  If missing: build it before writing checkpoint. Admin routes with no UI trigger are invisible debt.
- NO: proceed.

**README sync:**
If README.md exists in the project root:

1. Read README.md.
2. Compare against session work — focus on: commands table, agents table, skills list, version history, folder structure diagram.
3. If any entry is stale or missing (new command added, new skill installed, new agent created, structural change):
   - Quote the stale section
   - State what it should say
   - Mark as: NEEDS UPDATE
4. If README is accurate: state "README sync: no changes needed."

If any NEEDS UPDATE items found, show the exact proposed edits, then ask:
"Apply these? (yes / skip)"
- yes: apply all changes to README.md now
- skip: log in Friction Log with prefix "README drift:", continue

**Env var audit:**
Was a new environment variable introduced this session?

- NO: skip. State "Env var audit: no new vars."
- YES: for each new env var, verify all four of the following are in sync:
  1. `.env.local` — var is set locally (dev can run it)
  2. `.env.example` — var is documented with a placeholder and comment
  3. `next.config.ts` — var is in the required[] array (if it's required at build time)
  4. `instrumentation.ts` — var is in the checks{} object with correct phase annotation
  5. `CLAUDE.md` — var is listed in the Environment Variables section with purpose and phase

  For each location missing the var:
  - State exactly what to add and where
  - Mark as: NEEDS UPDATE

  If any NEEDS UPDATE items found, show the exact proposed edits, then ask:
  "Apply these? (yes / skip)"
  - yes: apply all changes to the listed files now
  - skip: log in Friction Log with prefix "Env drift:", continue

  Note: not all vars belong in next.config.ts required[] — only those that must exist at
  Vercel build time. Client-side vars (NEXT*PUBLIC*\*) that are optional at build time
  can be omitted from that array. Use judgment.

**Dependency drift check:**
Was a new npm package added this session (via npm install or package.json edit)?

- NO: skip. State "Dependency audit: no new packages."
- YES: for each new package:
  1. Check if the functionality already exists in package.json under a different package.
     Flag duplicates — e.g. adding axios when fetch is already used, or date-fns when
     dayjs is already installed.
  2. Check if the package is used in more than one file. If only used in one place,
     flag as a candidate for removal — inline the logic instead if it's simple enough.
  3. Check if a lighter alternative exists for the specific use case.
     Flag if the package is >50kb and the use case is narrow (one function, one feature).

  For each flag:
  - State the concern and proposed alternative
  - Mark as: REVIEW BEFORE SHIP
  - Do not remove anything. Report only.
  - Log in Friction Log with prefix "Dep bloat:"

**Spec doc alignment:**
From the Completed This Session list, determine which domains were touched this session:

| If session touched... | Check this doc |
|---|---|
| any `.tsx` / `.css` / UI component | `DESIGN.md` |
| any `/api/*` route, auth, or middleware | CLAUDE.md API/Auth section |
| any `.env`, config, or infra file | CLAUDE.md env section |

For each triggered domain:
1. Read the governing doc.
2. Compare against session work — focus on: new components, new tokens, new patterns, new endpoints, new constraints introduced this session.
3. If doc is stale or missing coverage:
   - Quote the gap
   - State exactly what to add or update
   - Mark as: NEEDS UPDATE
4. If doc is accurate: state "[doc]: no changes needed."

If any NEEDS UPDATE items found, show the exact proposed edits, then ask:
"Apply these? (yes / skip)"
- yes: apply all changes to the listed docs now
- skip: log in Friction Log with prefix "Spec drift:", continue

**Handoff archive:**
Scan `handoffs/` for `.md` files with `status: done` in frontmatter.
- NONE FOUND: skip. State "Handoff archive: nothing to archive."
- ANY FOUND: move each to `handoffs/done/[filename]`. Create `handoffs/done/` if it doesn't exist.
  State "Archived handoff: [filename]" for each. Log in Friction Log as "Archived handoff: [filename]."

Write sessions/checkpoint-[slug].md:

## Session

[slug] — [YYYY-MM-DD HH:MM Bangkok time (UTC+7)]

## Current Phase

[Phase name and number from PHASES.md]

## Completed This Session

[Bullet list of what was built or completed]

## Remaining in This Phase

[Bullet list of what's left from the current phase prompt in PHASES.md]

## Friction Log

[Bullet list of anything this session that felt manual, repetitive, or like it should
be automatic. Be specific — "had to manually set max_tokens for resolver" is useful.
"prompts could be better" is not.

Also include: any assumption that turned out wrong mid-session, any rule from CLAUDE.md
or rules/ that needed to be enforced manually, any pattern recreated from scratch.

Prefixed items from pre-write checks also go here:

- "Env drift:" — env var out of sync across files
- "Dep bloat:" — dependency concern flagged
- "Spec drift:" — spec doc (DESIGN.md, CLAUDE.md) out of sync with session work
- "Content drift:" — copy misalignment found

If nothing: "None."]

## Gotchas & Dead Ends

[Approaches tried and abandoned, and WHY they failed. Workarounds currently active
that the next session needs to know about. Be specific.
If nothing: "None."]

## Phase Complete Summary

[Only if ALL DoD items checked. Include:

- What was built
- What was fixed
- Decisions made
- New env vars introduced (name, purpose, where to get it)
- Manual verification steps
  If phase not complete, omit this section entirely.]

## Resume Prompt

[Exact instruction to start the next session — specific file, specific action.
Always first line: "Read CLAUDE.md, PHASES.md, and DESIGN.md before starting."
Then: what to do next.]

---

POST-LAUNCH MODE:

1. Derive slug from what was worked on.

2. Pre-write checks — run all of the following:

**Changed files precheck:** Run `git status --short`. Gate expensive checks on this list (same rules as phase mode).

**Admin route check:** Same as phase mode.

**Docs sweep:**
If no docs/ directory exists: skip this step.

**First post-launch detection:**
Scan sessions/ and sessions/archive/ for any checkpoint file containing "Session Type: Post-launch".
- NONE FOUND → first post-launch session. State: "First post-launch session detected. Docs were not swept during build phases."
  Ask: "Run retroactive docs sweep against all archived sessions? (yes / skip)"
  - yes:
    1. Read all files in sessions/archive/checkpoint-*.md
    2. Extract every `## Completed This Session` section from each file
    3. Combine into one session work summary
    4. Run `find docs/ -name '*.md' | sort` to list docs
    5. Spawn docs-sweep agent with: combined summary + doc list
    6. Wait for agent. Log updated files in Friction Log.
  - skip: log in Friction Log as "Retroactive docs sweep skipped — run manually if needed."
- ANY FOUND → not first time. Run normal session-scoped sweep:
  1. Run `find docs/ -name '*.md' | sort` to list docs
  2. Spawn docs-sweep agent with: current session's Completed This Session list + doc list
  3. Wait for agent. Log updated files in Friction Log if any needed changes.

**README sync:** Same as phase mode.

**Env var audit:** Same as phase mode.

**Dependency drift check:** Same as phase mode.

**Spec doc alignment:** Same as phase mode.

**Content alignment audit:**
From the Completed This Session list, check if ANY of the following changed this session:

- Agent behavior, scoring logic, or pipeline output
- Pricing tiers, limits, or free vs paid gating
- Data collection, storage, or retention behavior
- Any user-facing feature, flow, or product claim

IF NONE changed: skip. State "Content alignment: no triggers."

IF ANY changed:

1. Read CLAUDE.md for source of truth on what the product actually does.
2. Read docs/STRATEGY.md if it exists — ICP, pricing rationale, positioning claims.
3. Scan the following for misalignment against what changed this session:
   - Landing page copy (app/ or pages/ — hero, how-it-works, features, pricing sections)
   - Pricing page — tier names, limits, feature lists
   - Terms of service — data collection, usage claims
   - Privacy policy — what's collected, how it's used
   - Any user-facing strings in the app that describe what the product does

4. For each misalignment found:
   - Quote the stale copy
   - State what it should say based on current implementation
   - Mark as: NEEDS UPDATE

5. If any NEEDS UPDATE items found, show the exact proposed edits, then ask:
   "Apply these? (yes / skip)"
   - yes: apply all changes to the listed files now
   - skip: log in Friction Log with prefix "Content drift:", continue

**Handoff archive:** Same as phase mode.

3. Find a home in PHASES.md:
   - Work relates to an existing phase?
     YES: append under that phase:
     ### Post-launch: [short label] — [date]
     - [bullet: what was done]
       NO: create new entry at bottom:
     ## Phase [N] — [Descriptive Name]
     ### Post-launch: [short label] — [date]
     - [bullet: what was done]
       Mark checked [x] if complete.

4. Write sessions/checkpoint-[slug].md:

## Session

[slug] — [YYYY-MM-DD HH:MM Bangkok time (UTC+7)]

## Session Type

Post-launch — [short description]

## Completed This Session

[Bullet list of what was built, fixed, or changed]

## Friction Log

[Same rules as phase mode. If nothing: "None."]

## Gotchas & Dead Ends

[Same rules as phase mode. If nothing: "None."]

## PHASES.md Update

[Note which phase was updated or created and what was added]

## Resume Prompt

[If work incomplete: exact instruction to resume.
If complete: "Session complete. No resume needed."]

---

When done, confirm:

---

✅ CHECKPOINT SAVED → sessions/checkpoint-[slug].md

Safe to compact or start new thread. /start will detect this file and resume.

Next steps — three independent commands, different cadences:

/git      — run whenever you want to commit. Captures app code only (.claude/ and sessions/ are gitignored). No dependency on /improve.
/improve  — run periodically, every 3–5 sessions. Batch-processes friction from accumulated checkpoints into fixes + Claude.ai prompts. Gets better with more checkpoints — don't run it solo every session.

---
