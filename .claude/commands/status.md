---
name: status
description: Quick session state snapshot — current phase, last checkpoint, outstanding improvements. Use at session start or after compaction to reorient without running /start.
---

If CLAUDE.md contains "mode: template": template mode.
Read `.claude/rules/template-mode.md` — follow the /status section, then stop.

---

Read the following in parallel:

1. PHASES.md — current phase (last unchecked `[ ]` item) or "post-launch" if all checked
2. sessions/ — list checkpoint-*.md files by modified date, most recent first
3. sessions/improvements.md — count Outstanding items; note any flagged as stale (>14 days)

Output exactly:

---
**Status**

Phase: [phase name + number, or "Post-launch"]
Last checkpoint: [checkpoint slug + date from file header, or "none"]
Outstanding improvements: [N] ([N stale if any >14 days old])
Sessions since last /improve: [count of checkpoint-*.md files]
---

If checkpoint files exist and sessions since last /improve > 2: add note: "Consider running /improve — [N] sessions unprocessed."

Done. No further action.
