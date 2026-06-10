---
name: ship-phase
description: Run phase DoD checklist, confirm all items pass, mark phase complete in PHASES.md, then auto-run /checkpoint. Use at the end of every phase instead of manually checking off items.
---

If CLAUDE.md contains "mode: template": template mode.
Read `.claude/rules/template-mode.md` — follow the /ship-phase section, then stop.

Read PHASES.md. Identify the current active phase (first unchecked phase).

STATE: "Running DoD checklist for Phase [X] — [Phase Name]"

STEP 1 — Extract DoD items:
Read the Definition of Done section for the current phase from PHASES.md.
List every item. Do not skip any.

STEP 2 — Verify each item:
For each DoD item, check whether it's actually complete in the codebase.
- Read relevant files
- Run relevant checks (tsc --noEmit, grep for patterns, check file existence)
- Mark each: ✅ PASS or ❌ FAIL — [reason]

STEP 3 — Run audits:
Run /audit-backend. If violations found: STOP. List them. Do not proceed.
Run /audit-ui. If violations found: STOP. List them. Do not proceed.
If phase includes any .tsx or .css changes: verify UI passes `.claude/skills/impeccable/SKILL.md` standards. If violations found: STOP. List them. Do not proceed.

STEP 4 — Decision:

ALL PASS:
- Mark phase as complete in PHASES.md: change [ ] to [x]
- State: "Phase [X] complete. All DoD items verified."
- Run /checkpoint automatically (phase mode)

ANY FAIL:
- List all failing items
- State: "Phase [X] incomplete. Fix the items above, then re-run /ship-phase."
- Do NOT mark phase complete
- Do NOT run /checkpoint

Rules:
- Never mark a phase complete if any DoD item is unverified
- Never skip the audit steps
- If PHASES.md has no explicit DoD section for the phase, state:
  "No DoD found for this phase. Add one to PHASES.md before shipping."
  and stop.
- If all phases are already checked (post-launch mode): state
  "No active phase. You're in post-launch mode. Use /checkpoint instead."
  and stop.
