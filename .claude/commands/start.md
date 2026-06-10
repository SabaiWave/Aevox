---
name: start
description: Begin or resume a session — reads spec docs, detects context (active phase vs post-launch), and executes accordingly.
---

Read CLAUDE.md, PHASES.md, and DESIGN.md in full before doing anything else.
Read `.claude/skills/karpathy-skills/SKILL.md` now — behavioral guardrails active for all work this session.
Read `.claude/skills/security/SKILL.md` now — security prevention rules active for all work this session.
If this session involves any .tsx or .css work, also read `.claude/skills/impeccable/SKILL.md` now.

CONTEXT DETECTION — run this logic first, every session:

If CLAUDE.md contains "mode: template": template mode.
Read `.claude/rules/template-mode.md` — follow the /start section, then stop.

1. Check PHASES.md — are there any unchecked phases?
   - YES (unchecked phases exist): PHASE MODE — continue to step 2.
   - NO (all phases checked): POST-LAUNCH MODE — skip to step 4.

2. PHASE MODE — check for session files:
   Scan sessions/ for any checkpoint-*.md files.
   - NO FILES: identify the first unchecked phase in PHASES.md.
     Execute that phase prompt exactly as written. Do not skip DoD.
   - ONE FILE: read it. Check friction log.
     If improvements.md does NOT exist AND Friction Log is non-empty:
     State: "⚠ Unprocessed friction from last session. Run /improve before continuing."
     Wait for instruction. Do not resume until user responds.
     Otherwise: use Resume Prompt to pick up where left off.
   - MULTIPLE FILES: list them with last-modified time. Ask:
     "Found [N] checkpoint files:
     1. checkpoint-[slug1].md (modified [time])
     2. checkpoint-[slug2].md (modified [time])
     Which to resume? (default: most recent)"
     Wait for response. Load chosen file. Apply friction check same as ONE FILE above.

3. PHASE MODE rules:
   - Do not deviate from the architecture in CLAUDE.md or rules/.
   - Do not skip the definition of done.
   - When a phase completes: check it off in PHASES.md, summarize what was built,
     state "Phase X complete. Ready for Phase X+1." Do not proceed without instruction.

4. POST-LAUNCH MODE:

   HANDOFF CHECK — scan handoffs/ for .md files with `status: pending` in frontmatter.
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

   SESSION CHECK — scan sessions/ for any checkpoint-*.md files.
   - NO FILES: state "All phases complete. Running in post-launch mode."
     Ask: "What are we working on this session?"
     Wait for instruction. Do not invent work.
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

Rules (all modes):

- Do not deviate from the architecture in CLAUDE.md or rules/.
- Do not skip the definition of done.
- Communication style: caveman. No filler. No pleasantries. Fragments OK.

After outputting the session kickoff summary, always append:

---

⚡ SESSION OPEN. When done: /checkpoint
/checkpoint saves progress, captures friction. Safe mid-session before compaction.
New thread same feature? /checkpoint here → /start there → picks up exact file.

---
