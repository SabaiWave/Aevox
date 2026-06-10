# Template Mode Rules

This file governs all template-specific behavior for commands run against the sbw-template repo.

## Convention

Every command file must include this redirect at the top of its context detection block:

> If CLAUDE.md contains "mode: template": template mode.
> Read `.claude/rules/template-mode.md` — follow the /[command-name] section, then stop.

---

## /start

State: "Template mode. Skipping phase execution."

HANDOFF CHECK — scan `handoffs/` for `.md` files with `status: pending` in frontmatter.
- NO PENDING HANDOFFS: skip to SESSION CHECK below.
- ONE PENDING HANDOFF:
  Read the file. Extract: title, date, scope, fix IDs from Execution Order table.
  State:
  "📋 Handoff: [title] ([date], scope: [scope])
   Fixes in order: [A → B → C...]"
  Ask: "Execute this handoff? (yes / skip)"
  - yes: read handoff in full. Execute fixes in order from the Execution Order table.
    Work sequentially — verify each fix against its "Done when:" before moving to next.
    After all fixes done: update handoff frontmatter `status: pending` → `status: done`.
    State: "Handoff complete. Run /checkpoint." Stop.
  - skip: continue to SESSION CHECK below.
- MULTIPLE PENDING HANDOFFS:
  List them:
  "Found [N] pending handoffs:
   1. [title] — [date] (scope: [scope])
   2. [title] — [date] (scope: [scope])"
  Ask: "Execute one? (1 / 2 / N / skip)"
  Wait for response. Load chosen and follow ONE PENDING flow, or skip.

SESSION CHECK — scan `sessions/` for any checkpoint-*.md files.
- NO FILES: ask "What are we working on this session?" Wait for instruction. Do not invent work.
- ONE FILE: state "Found checkpoint-[slug].md. Resume this or start something new?"
  Wait for response.
  - Resume: load file, use Resume Prompt.
  - New: ask "What are we working on?" and proceed.
- MULTIPLE FILES: list them. Ask:
  "Found [N] checkpoint files:
  1. checkpoint-[slug1].md (modified [time])
  2. checkpoint-[slug2].md (modified [time])
  Resume one, or start something new?"
  Wait for response. Load chosen file or ask what to work on.

Apply the session-open footer after the user responds.

---

## /checkpoint

This is the sbw-template repo — not a live project. Skip all product-specific checks.

**Handoff archive:**
Scan `handoffs/` for `.md` files with `status: done` in frontmatter.
- NONE FOUND: skip. State "Handoff archive: nothing to archive."
- ANY FOUND: move each to `handoffs/done/[filename]`.
  State "Archived handoff: [filename]" for each. Log in Friction Log as "Archived handoff: [filename]."

**Command hygiene scan:**
Scan all `.claude/commands/*.md` files for the string `"mode: template"`.
Each file should contain it exactly once (the redirect line).
If any file contains it more than once: inline template logic exists that should be extracted.

For each violation:
1. Quote the inline template logic
2. Propose the extracted version — show exactly what to add to `template-mode.md` and what to replace it with in the command file (the 2-line redirect)
3. Mark as: NEEDS UPDATE

If any NEEDS UPDATE items found, show the exact proposed edits, then ask:
"Apply these? (yes / skip)"
- yes: move the logic to `template-mode.md` and replace with redirect now
- skip: log in Friction Log with prefix "Template drift:", continue

If all clean: state "Command hygiene: no inline template logic found."

**Changed files precheck:**
Run `git status --short` to list modified files.
Skip README sync if no changes to `.claude/commands/`, `.claude/agents/`, `.claude/skills/`, or `README.md`.

**README sync:**
If README.md exists in the project root:
1. Read README.md.
2. Compare against session work — focus on: commands table, agents table, skills list, version history table, folder structure diagram.
3. If any entry is stale or missing:
   - Quote the stale section
   - State what it should say
   - Mark as: NEEDS UPDATE
4. If README is accurate: state "README sync: no changes needed."

If any NEEDS UPDATE items found, show the exact proposed edits, then ask:
"Apply these? (yes / skip)"
- yes: apply all changes to README.md now
- skip: log in Friction Log with prefix "README drift:", continue

Write sessions/checkpoint-[slug].md:

## Session

[slug] — [YYYY-MM-DD HH:MM Bangkok time (UTC+7)]

## Session Type

Template update — [short description of what changed]

## Completed This Session

[Bullet list of what was built, updated, or fixed in the template]

## Friction Log

[Bullet list of anything manual, repetitive, or that should be automatic.
Be specific — vague items ("prompts could be better") are not useful.
If nothing: "None."]

## Gotchas & Dead Ends

[Approaches tried and abandoned, and WHY. Workarounds the next session needs to know.
If nothing: "None."]

## Resume Prompt

[If work incomplete: exact instruction to resume.
If complete: "Session complete. No resume needed."]

---

When done, output the confirm block below — not the one at the bottom of checkpoint.md. That block is for project mode only.

---

✅ CHECKPOINT SAVED → sessions/checkpoint-[slug].md

Safe to compact or start new thread.

Next steps — three independent commands, different cadences:

/git      — run whenever you want to commit. In template mode, .claude/ and sessions/ ARE tracked — /git captures everything.
/improve  — run periodically, every 3–5 sessions. If run before /git, its .claude/ patches land in the same commit. If after, they're a separate commit. Both fine.

---

## /git

Skip phase detection entirely. Treat as tooling repo — no phase classification needed.
Continue with STEP 2 in git.md to propose commit/tag/push.

**Template tagging rule:**
- Tag if it changes HOW you use the template — behavior, workflow, rules, commands, skills, structure
- No tag for typos, rewording with identical meaning, formatting-only changes
- Every tag must have a matching README version history entry, and vice versa — they must stay 1:1

**Version history sync check:**
Before finalizing any proposal that includes a tag:
1. Read README.md version history table
2. Verify the proposed tag (e.g. v2.4) has a matching entry — if missing, STOP and state:
   "README version history has no entry for [vX.Y]. Add one before tagging."

Before finalizing any proposal without a tag:
1. Read README.md version history table
2. Check if any version entry is newer than the latest git tag
3. If yes, flag and propose adding the missing tag to the commit

---

## /spec

State: "Template mode. /spec runs in project repos, not the template itself. To use it: copy `.claude/templates/brief.md` to your project root, fill it in, then run /spec there."
Stop.

---

## /docs-sweep

State: "Template mode. No docs/ content to sweep in sbw-template."
Stop.

---

## /status

Read sessions/ for checkpoint-*.md files (most recent first).
Read sessions/improvements.md for Outstanding count.

Output:

---
**Status** (template mode)

Last checkpoint: [slug + date, or "none"]
Outstanding improvements: [N] ([N stale if any >14 days old])
Sessions since last /improve: [count of checkpoint-*.md files]
---

Done. No further action.

---

## /ship-phase

State: "This is the sbw-template repo. /ship-phase is for real projects only. Use /checkpoint instead."
Stop.
