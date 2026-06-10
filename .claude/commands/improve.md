---
name: improve
description: End-of-session command. Reads ALL sessions/checkpoint-*.md files, consolidates friction into improvements.md, proposes in-repo fixes and Claude.ai spec-skill updates, then auto-archives processed checkpoint files. Run once after all /checkpoint saves for the session.
---

PENDING REVIEW — run first, before reading checkpoint files:

Read sessions/improvements.md if it exists.
Read the ## Outstanding section for any items.

If any found:
  List them: "[N] item(s) still pending:"
  - [short label] — [skill] — added [Added date]

  Flag any item where Added date is >14 days ago: "⚠️ [label] — added [N] days ago, may be stale"

  Ask: "Mark any as done? Enter labels or 'skip'"
  - If user names items: delete the full item block from ## Outstanding for each. Confirm each deletion.
  - skip: leave as-is. Items stay in Outstanding.

If none found: continue.

---

Scan sessions/ for ALL files matching checkpoint-*.md.

If no checkpoint-*.md files exist:
State: "No checkpoint files found. Nothing to improve." and stop.

List the files found:
"Reading: checkpoint-[slug1].md, checkpoint-[slug2].md, ..."

Read each file in full. Focus on the Friction Log section of each.

---

STEP 1 — Consolidate and classify all friction items across all files.

Two lanes only:

LANE 1 — IN-REPO FIX
Anything fixable by editing a file in this project.
Includes: app code, rules/, CLAUDE.md (the file itself), .claude/commands/, .claude/skills/, .claude/agents/, .claude/hooks/

When the fix touches a .claude/ file (commands, skills, agents, hooks):
Mark it: ⚠️ PROPAGATE TO TEMPLATE — this file lives in sbw-template and must be updated there too after applying here.

Template hygiene check: before proposing any fix to .claude/commands/ or .claude/skills/ files, verify the proposed text contains no project-specific values — token names, hex colors, URL patterns, env var names. These files are shared templates. Project-specific constraints belong in CLAUDE.md or DESIGN.md, not in template commands.

When classifying, specify exactly where the fix goes:
- rules/frontend.md — frontend component, styling, or Tailwind violations
- rules/api.md — API route patterns, auth, middleware
- rules/database.md — Supabase, migrations, singleton patterns
- rules/testing.md — test structure, fixtures, coverage patterns
- rules/settings.md — permissions, settings.json vs settings.local.json, path hygiene
- rules/template-mode.md — template-specific behavior for all commands
- CLAUDE.md — stack reference, folder structure, npm commands only
- .claude/commands/[name].md — workflow command update (⚠️ PROPAGATE TO TEMPLATE)
- .claude/skills/[name]/SKILL.md — skill behavior update (⚠️ PROPAGATE TO TEMPLATE)
- .claude/agents/[name].md — agent behavior or toolset update (⚠️ PROPAGATE TO TEMPLATE)
- .claude/hooks/[name].sh — pre-commit or automation script (⚠️ PROPAGATE TO TEMPLATE)

LANE 2 — CLAUDE.AI FIX
Friction caused by a gap in the skills that generate the four spec files:
CLAUDE.md, DESIGN.md, PHASES.md, PRODUCT.md

If the friction is "the generated spec was wrong or missing something" → Claude.ai fix.
If the friction is "Claude Code behaved wrong mid-session" → in-repo fix (Lane 1).

Specify which spec-generating skill:
sbw-intake, sbw-strategy, sbw-stack, sbw-scaffold, sbw-design,
sbw-gtm, sbw-onboarding, sbw-launch, sbw-prompt, sbw-friction

---

STEP 2 — Output: Proposed in-repo fixes

For each in-repo fix:
### In-repo fix — [short label]
File: [exact file path e.g. rules/api.md or .claude/commands/checkpoint.md]
Add after: [quote the line it should follow, or "end of file"]
Proposed text:
[Exact text to paste — written as a rule, not a note]
Action: Apply directly to this file. [If .claude/ file: ⚠️ Then copy updated file to sbw-template at the same path.]
---

If no in-repo fixes: state "No in-repo fixes needed."

After listing all proposed in-repo fixes, ask:
"Apply these in-repo fixes now? (yes / skip)"

- yes: apply each fix directly to the files listed. Confirm each one as it's applied.
- skip: leave files unchanged. User will apply manually.

---

STEP 3 — Update sessions/improvements.md

File has two sections — maintain exactly:

### Section 1: ## Outstanding
Contains active Claude.ai fix items only. Each item block:

---
### [Short label]
- Added: [YYYY-MM-DD]
- Source: checkpoint-[slug].md
- Friction: [exact friction item]
- Skill: [skill name]
- Proposed change: [specific language to add, remove, or modify]
- Priority: high / medium / low

**Paste into Claude.ai:**
```
I have an improve log item. Apply this update to the [skill name] skill.

Item: [short label]
Friction: [exact friction item]
Proposed change: [specific language to add, remove, or modify]
```
---

If no outstanding items: write `_No pending items._`

When an item is marked done (during PENDING REVIEW): delete its full block from Outstanding. Do not leave a placeholder.

### Section 2: ## Last Run
A single line, always overwritten (not appended):

_Last run: [YYYY-MM-DD HH:MM Bangkok UTC+7] — [N] session(s), [N] new items, [N] cleared_

---

If improvements.md does not exist: create it with both sections (Outstanding empty, Run Log with first row).

---

ARCHIVE STEP:

1. Create sessions/archive/ if it doesn't exist.
2. For each checkpoint-[slug].md processed:
   Move to sessions/archive/checkpoint-[slug]-[YYYY-MM-DD-HHmm].md
3. Confirm each move before deleting original.

---

When done, state:

---
🔁 IMPROVE DONE — [N] sessions consolidated.

Lane 1 — In-repo fixes: [X] items applied.
[List each, marking ⚠️ PROPAGATE TO TEMPLATE where applicable]
→ [short label] — [file path] [⚠️ propagate to sbw-template]

Lane 2 — Claude.ai fixes: [Y] items pending.
[List each:]
→ [short label] — [skill name] — paste prompt in Claude.ai → item lives in Outstanding until done

Checkpoint files archived → sessions/archive/
sessions/ is clean. Ready for next session.

Run /git to commit any source code changes. improvements.md, checkpoint files, and all .claude/ patches are gitignored — /git only ever captures app code.
---
