---
name: docs-sweep
description: Manually trigger a docs/ sync against session work. Asks scope (session or retroactive), reads checkpoint files automatically, spawns docs-sweep agent. Works in any mode.
---

If CLAUDE.md contains "mode: template": template mode.
Read `.claude/rules/template-mode.md` — follow the /docs-sweep section, then stop.

---

Check if docs/ directory exists.
- NO: State "No docs/ directory found. Nothing to sweep." and stop.
- YES: continue.

Ask: "Scope? (session / retroactive)"

**session:**
1. Find the most recent file in sessions/ matching checkpoint-*.md (by modified date).
2. If none found: State "No checkpoint file found. Run /checkpoint first to record session work." and stop.
3. Read the file. Extract the `## Completed This Session` section.
4. Run `find docs/ -name '*.md' | sort` to list docs.
5. Spawn docs-sweep agent with: extracted session work + doc list.
6. Wait for agent to complete. Report one-line status per file.

**retroactive:**
1. Find all files in sessions/archive/ matching checkpoint-*.md.
2. Also include any unarchived checkpoint-*.md files in sessions/.
3. If none found: State "No checkpoint files found to sweep against." and stop.
4. Read each file. Extract every `## Completed This Session` section.
5. Combine into one session work summary, labeled by slug.
6. Run `find docs/ -name '*.md' | sort` to list docs.
7. Spawn docs-sweep agent with: combined summary + doc list.
8. Wait for agent to complete. Report one-line status per file.

---

When done, state:

---
✅ DOCS SWEEP COMPLETE — [session / retroactive]
[N] docs scanned. [N] updated, [N] unchanged.
---
