# sbw-template

Universal Claude Code starter kit for Sabai Wave (SBW) projects. Clone into every new project — never modify directly during a build.

## What's inside

```
.claude/
  agents/          — code-reviewer, debugger, docs-sweep, migration-writer, security-auditor, test-writer
  commands/        — start, checkpoint, improve, docs-sweep, status, audit-backend, audit-ui, ship-phase, git, spec
  templates/       — brief.md (copy to project root and fill in before running /spec)
  hooks/           — pre-commit.sh, lint-on-save.sh
  rules/           — api.md, database.md, frontend.md, testing.md, settings.md, template-mode.md
  skills/          — impeccable/ (design enforcement), karpathy-skills/ (behavioral guardrails), security/ (prevention rules)
docs/              — placeholder business-layer docs (not read by Claude Code)
CLAUDE.md          — placeholder (replaced by /spec output)
PHASES.md          — placeholder (replaced by /spec output)
DESIGN.md          — placeholder (replaced by /spec output)
PRODUCT.md         — placeholder (replaced by /spec output)
sessions/          — checkpoint and improvement logs (gitignored per project)
handoffs/          — handoff docs from Claude.ai planning sessions (gitignored per project)
  done/            — archived after /checkpoint runs
```

## Commands & agents reference

### Commands

| Command | What it does | When to use it | How it relates to other commands |
| ------- | ------------ | -------------- | --------------------------------- |
| /start | Starts or resumes a session. In post-launch mode, checks `handoffs/` for pending handoff docs before asking what to work on; otherwise selects phase mode or post-launch mode. | First command in a new thread or when returning to work. | Usually the entrypoint. It expects /checkpoint files for resume flow and may block for /improve if prior friction is unprocessed. |
| /checkpoint | Saves session state to sessions/checkpoint-[slug].md with completed work, remaining work, friction, dead ends, and resume prompt; updates PHASES.md context as needed; archives completed handoff docs to handoffs/done/. | Mid-session before compaction, context reset, or thread handoff; also at session end. | Feeds /improve (its only input source). /ship-phase auto-runs /checkpoint only after all DoD/audits pass. |
| /improve | Reviews PENDING items from prior runs, reads all checkpoint files, consolidates friction into sessions/improvements.md, proposes in-repo fixes (with sbw-template propagation flags for .claude/ files) and Claude.ai spec-skill updates, then archives processed checkpoints. | End of session batch, after one or more /checkpoint saves. | Depends on /checkpoint outputs. Clears sessions/ by archiving checkpoint files and closes the loop before the next /start resume cycle. |
| /audit-backend | Report-only backend compliance audit across src/ and app/api/ against CLAUDE.md and rules for API/database/testing patterns. | During implementation and always before phase completion. | /ship-phase requires this audit; failures block shipping. Pair with /audit-ui for full compliance coverage. |
| /audit-ui | Report-only UI compliance audit across app/ (and UI files in src/) against DESIGN.md and frontend rules. | During UI work and before phase completion. | Companion to /audit-backend. /ship-phase requires this audit; violations block completion. |
| /ship-phase | Executes current phase DoD verification, runs required audits, marks phase complete in PHASES.md only when all checks pass, then auto-runs /checkpoint. | Exactly at phase end, instead of manually checking boxes. | Orchestrates final gate. It invokes /audit-backend + /audit-ui and then triggers /checkpoint on success. If any item fails, it stops and does not checkpoint. |
| /git | Detects repo and phase context, proposes one safe git action (commit/tag/push combinations), and executes only after explicit approval. | When you want guided git operations with a preview before running commands. | Independent helper that can be used after routine work, after /ship-phase, or for milestone sync; it never bypasses approval. |
| /docs-sweep | Manually triggers a docs/ sync. Asks scope (session or retroactive), reads checkpoint files automatically, spawns the docs-sweep agent. Works in any mode. | When you want to sync docs/ mid-build without waiting for post-launch mode, or to trigger a retroactive sweep on demand. | Manual companion to the automated docs sweep in /checkpoint post-launch mode. Uses the docs-sweep agent. |
| /status | Quick session state snapshot — outputs current phase, last checkpoint slug, outstanding improvement count, and sessions since last /improve. | At session start or after compaction to reorient without running /start. | Lightweight read-only helper. No side effects. |
| /spec | Reads `brief.md` from the project root and generates all 4 spec files in one pass (CLAUDE.md, PHASES.md, DESIGN.md, PRODUCT.md), then creates satellite doc stubs (docs/env-vars.md, docs/decisions.md, docs/build-notes.md). | After filling in `brief.md`. Run before /start. | Copy `.claude/templates/brief.md` to the project root and fill in every field first. Replaces the sbw-scaffold + sbw-design Claude.ai skill workflow for spec file generation. |

### ship-phase vs checkpoint

- /ship-phase is a strict phase-completion gate. It verifies DoD, runs audits, and can modify PHASES.md status to complete.
- /checkpoint is a session-state save. It records progress and friction, but does not certify DoD or complete a phase by itself.
- Use /checkpoint anytime you need continuity. Use /ship-phase only when you believe the phase is actually done.
- On success, /ship-phase runs /checkpoint automatically, so you usually do not run an extra checkpoint right after shipping.

### Agents

| Agent file | What it does | When to use it | How it relates to commands/workflow |
| ---------- | ------------ | -------------- | ------------------------------------ |
| .claude/agents/code-reviewer.md | Reviews recent changes for bugs, security issues, and SBW convention violations; reports CRITICAL/WARNING/SUGGESTION findings. | After code changes and before considering a phase complete, especially for API/routes/agents/auth changes. | Complements /audit-backend by adding diff-aware quality review. Use findings to fix issues, then re-run audits or /ship-phase checks. |
| .claude/agents/debugger.md | Diagnoses failures by tracing error call chains, forming one root-cause hypothesis, and applying minimal verified fixes. | When a runtime error or failing test appears and root cause is unclear. | Supports implementation between /start and /checkpoint. After fixes, run tests/audits and proceed toward /ship-phase if phase-end. |
| .claude/agents/migration-writer.md | Writes Supabase migrations with SBW safety conventions (RLS, policies, grants, non-destructive bias). | Any schema change requiring SQL migration files. | Produces migration artifacts that should pass /audit-backend checks and can later be reviewed by code-reviewer/security-auditor before /ship-phase. |
| .claude/agents/security-auditor.md | Runs a report-only security audit for secrets, rate limiting, validation, RLS, webhook verification, auth boundaries, and dependency risks. | Before shipping phases, and any time security posture changes. | Security-focused companion to /audit-backend and /audit-ui; use it as an extra gate before /ship-phase for higher confidence. |
| .claude/agents/test-writer.md | Writes and validates Jest tests for agents, libs, and API routes using SBW patterns and fixtures. | When new logic lacks tests or when coverage is weak before release. | Strengthens DoD readiness for /ship-phase. Pairs well with debugger for red-green fixing and with /checkpoint to preserve testing progress. |
| .claude/agents/docs-sweep.md | Syncs docs/ to reflect completed session work — reads listed docs, compares against session work summary, writes updates directly to stale files. | Invoked automatically by /checkpoint in post-launch mode and by /docs-sweep command. | Shared agent used by both automated and manual docs sweep flows. Never invoked directly. |

### Typical command flow

1. /start
2. Build/fix work (optionally use debugger, test-writer, migration-writer, code-reviewer)
3. /audit-backend and /audit-ui during implementation
4. /ship-phase at phase end (auto-runs /checkpoint if all pass)
5. /improve after one or more checkpoint files exist
6. /checkpoint before committing — doc sync runs here and may update DESIGN.md, README, etc.
7. /git after /checkpoint — commits everything including any doc updates

## Command context modes

Commands auto-detect which context they're running in and behave accordingly.

| Context | How detected | Commands behavior |
| ------- | ------------ | ----------------- |
| **Template** | CLAUDE.md contains `mode: template` | `/start` checks `handoffs/` for pending handoff docs, then asks what to work on. `/checkpoint` skips env/dep/content checks — runs README sync + session log only. `/improve` routes fixes into two lanes: in-repo (with template propagation flags for .claude/ files) and Claude.ai spec-skill updates. `/ship-phase` redirects to `/checkpoint`. `/spec` redirects with instructions to use it in a project repo. |
| **Phase mode** | CLAUDE.md replaced + unchecked phases in PHASES.md | All commands run full behavior. `/ship-phase` is the end-of-phase gate. |
| **Post-launch mode** | CLAUDE.md replaced + all phases checked | `/checkpoint` and `/improve` run normally. `/ship-phase` redirects to `/checkpoint`. |

**When updating this template:** use `/checkpoint` (not `/ship-phase`) — it detects template context and skips the product-specific checks that don't apply here.

---

## What this is NOT

- Not a project. It's a starting point.
- `.claude/` is universal — never regenerated per project.
- The 4 root spec files are placeholders — always replaced before opening Claude Code.

---

## Starting a new project

### Step 1 — Clone the template

```bash
git clone git@github.com:alex-sabaiwave/sbw-template.git my-new-project
cd my-new-project
```

### Step 2 — Detach from the template repo

```bash
rm -rf .git
git init
```

### Step 3 — Create a new repo on GitHub

1. Go to github.com → **+** → **New repository**
2. Name: `my-new-project`
3. Visibility: **Private**
4. Leave all init options unchecked — empty repo
5. Click **Create repository**

### Step 4 — Point local repo to new GitHub repo

```bash
git remote add origin git@github.com:alex-sabaiwave/my-new-project.git
```

### Step 5 — Initial commit

```bash
git add .
git commit -m "init from sbw-template v2.0"
git branch -M main
git push -u origin main
```

### Step 6 — Fill in brief.md and run /spec

1. Copy `.claude/templates/brief.md` to the project root
2. Fill in every field — do not leave placeholders. If unknown, decide and note it.
3. Open Claude Code and run `/spec`

`/spec` generates CLAUDE.md, PHASES.md, DESIGN.md, PRODUCT.md in one pass, then creates docs/env-vars.md, docs/decisions.md, and docs/build-notes.md stubs.

> Note: business-layer docs (docs/STRATEGY.md, docs/GTM.md, docs/ONBOARDING.md) are not generated by /spec — produce these separately in Claude.ai as needed.

### Step 8 — Make hooks executable

```bash
chmod +x .claude/hooks/*.sh
```

### Step 9 — Commit spec files

```bash
git add .
git commit -m "add spec files — ready for Phase 1"
git push
```

### Step 10 — Open Claude Code and start

```bash
/start
```

Claude Code reads CLAUDE.md, PHASES.md, and DESIGN.md → detects Phase 1 → begins.

---

## Spec file map

### Build-layer (read by Claude Code)

| File       | Generated by | When             |
| ---------- | ------------ | ---------------- |
| CLAUDE.md  | /spec        | Before Phase 1   |
| PHASES.md  | /spec        | Before Phase 1   |
| DESIGN.md  | /spec        | Before Phase 1   |
| PRODUCT.md | /spec        | Before Phase 1   |

### Business-layer (Claude.ai reference only)

| File               | Generated by   | When                        |
| ------------------ | -------------- | --------------------------- |
| docs/STRATEGY.md   | sbw-strategy   | Before scaffold             |
| docs/STACK.md      | sbw-stack      | Before scaffold (if needed) |
| docs/GTM.md        | sbw-gtm        | Before Phase 8              |
| docs/ONBOARDING.md | sbw-onboarding | Before Phase 8              |

---

## Improve loop

```
/checkpoint → /improve → sbw-friction (Claude.ai) → mark DONE in improvements.md
```

---

## Updating the template

All changes go to **main** — no branches needed for a solo dev.

### Writing new commands

Every command file must include the template-mode redirect at the top of its context detection block:

```
If CLAUDE.md contains "Generated by sbw-scaffold": template mode.
Read `.claude/rules/template-mode.md` — follow the /[command-name] section, then stop.
```

Add a corresponding section to `.claude/rules/template-mode.md` defining what the command does in template context.

```bash
# make your changes, then:
git add .
git commit -m "describe what changed"
git push
```

### Tagging versions

Tag if it changes how you USE the template — behavior, workflow, rules, commands, skills, or structure.
No tag if it changes only words — typos, rewording with identical meaning, formatting.

Every tag must have a matching version history entry in README, and vice versa. They must stay 1:1.

```bash
# create a tag
git tag v2.1

# push the tag to GitHub
git push origin v2.1

# list all tags
git tag

# see what changed between versions
git log v2.0..v2.1 --oneline
```

### Pulling template updates into an existing project

If you improve the template mid-build on another project, cherry-pick what you need manually — don't merge the template repo into a live project. Copy the specific file that changed and paste it in.

### Installing skills from the plugin marketplace

Plugin names in the marketplace may differ from the actual folder name installed.
After installing, always locate the actual SKILL.md before copying:

```bash
find ~/.claude -name "SKILL.md" -path "*[skill-keyword]*"
```

Copy from that path into `.claude/skills/[your-folder-name]/`. Do not assume the folder name matches the plugin name.

---

## Version history

| Version | Date       | Notes                                                                                                                              |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| v2.15   | 2026-06-10 | Added /spec command: generates all 4 spec files from brief.md in one pass + satellite doc stubs (docs/env-vars.md, decisions.md, build-notes.md). Added .claude/templates/brief.md with 3 confirmed field additions (Folder structure deviations, Phase hints, Stitch export clarification). Replaced "Generated by sbw-scaffold/sbw-design" with "Generated by /spec" across all 4 placeholder spec files. Added explicit `mode: template` detection marker to all 4 placeholder spec files. Updated template-mode detection string from "Generated by sbw-scaffold" to "mode: template" across all commands. Added handoff detection to /start in template mode. |
| v2.14   | 2026-06-10 | Added template hygiene check to /improve Lane 1 — verify no project-specific values before proposing .claude/ fixes. Added explicit confirm block authority note to template-mode.md /checkpoint section. |
| v2.13   | 2026-06-10 | Added light mode contrast checks (WCAG AA, mono font flag) and AI slop classification rule to /audit-ui — single deliberate instance is voice, not slop; flag only when same pattern repeats 3+ sections site-wide. |
| v2.12   | 2026-06-10 | Clarified /improve vs /git cadence: three independent commands, different cadences. Added mental model to footers — /git whenever, /improve every 3–5 sessions. Template-mode footer correctly reflects that .claude/ is committed. |
| v2.11   | 2026-06-07 | Added docs-sweep agent + /docs-sweep command (session or retroactive scope, reads checkpoints automatically). Added /status command. Moved docs sweep + content alignment to post-launch only in /checkpoint. Added first-post-launch retroactive sweep detection. Added staleness detection to /improve Outstanding items (14-day flag + Added: date field). |
| v2.10   | 2026-06-07 | Redesigned /improve: Outstanding+Last Run file format (lean, DONE items deleted), interactive PENDING review, carry-over removed. Added Bangkok timestamps to checkpoint/improve. Added git diff precheck to /checkpoint — gates README sync and docs sweep on changed files. |
| v2.9    | 2026-06-05 | Switched test framework to Jest (from Vitest); added CSS custom property inline style exception to frontend.md; added planning-brief protection rule to /checkpoint docs sweep. |
| v2.8    | 2026-06-05 | Added auto test-coverage rule to testing.md: expanded paths frontmatter to load when editing logic files (src/lib/, src/agents/, app/api/); added rule to assess and run affected tests after logic changes. |
| v2.7    | 2026-06-05 | Redesigned /improve fix routing into two explicit lanes: Lane 1 (in-repo, with ⚠️ PROPAGATE TO TEMPLATE flags for .claude/ files), Lane 2 (Claude.ai spec-skill generators only). Updated /checkpoint and template-mode footers to match. |
| v2.6    | 2026-06-05 | Added handoff workflow: `handoffs/` + `handoffs/done/` directories (gitignored), `/start` post-launch handoff detection (pending/multi-file handling, marks `status: done` on completion), `/checkpoint` handoff archive step (moves `status: done` files to `handoffs/done/`), template-mode redirect for `/start`, project-only gitignore section for scaffolded projects. |
| v2.5    | 2026-06-05 | Extracted template-specific logic into template-mode.md (2-line redirects per command). Added self-healing command hygiene scan. Established command authoring convention. Added /checkpoint→/git order rule, tag-if-it-changes-usage rule, version history ↔ tag 1:1 enforcement in /git, and git -C path pollution prevention. |
| v2.3    | 2026-06-05 | Added spec doc alignment check to /checkpoint (triggers DESIGN.md sync for UI work, CLAUDE.md sync for API/env work). Standardized propose-then-apply ("Apply these? yes / skip") pattern across all /checkpoint pre-write checks. |
| v2.2    | 2026-06-05 | Added template mode detection to /checkpoint and /ship-phase. Added Command context modes section to README. /ship-phase now redirects in post-launch and template contexts. |
| v2.1    | 2026-06-05 | Added karpathy-skills and custom security skill. Wired all three skills into start.md, CLAUDE.md, api.md, database.md, frontend.md, and ship-phase.md. |
| v2.0    | 2026-06-04 | Initial release. Clean universal template. impeccable replaces frontend-design skill. 4 placeholder spec files. docs/ layer added. |
