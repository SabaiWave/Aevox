---
name: git
description: Git operations helper for SBW projects. Detects repo context, proposes exactly one safe action, and executes only after explicit approval.
---

If CLAUDE.md contains "mode: template": template mode.
Read `.claude/rules/template-mode.md` — follow the /git section, then stop.

TRIGGER: User runs /git

STEP 1 — Detect context:

1. Run `git status` to inspect changed, staged, and untracked files.
2. Run `git log --oneline -5` to inspect recent commits.
3. Check PHASES.md and classify state as one of:
   - phase just completing
   - mid-phase
   - post-launch

IMPORTANT: Always use plain `git status` and `git log` — never `git -C /absolute/path`.
The `-C` flag causes machine-specific paths to be written to settings.json.

Safety checks before proposing anything:

- Never include node_modules, .env, .env.local, or sessions/ in commit scope.
- If git status shows unexpected files already staged, flag them clearly before proceeding.
- Default target branch is main for routine work.
- **settings.json path check:** If `.claude/settings.json` appears in the diff, scan it for
  absolute paths (any permission value containing `/Users/`, `/home/`, or `/root/`).
  If found:
  1. Remove the offending entries from `.claude/settings.json`
  2. Merge them into `.claude/settings.local.json` (create if missing, append to allow[] if exists)
  3. State: "Moved [N] absolute path permission(s) to settings.local.json"
  Then continue with commit proposal as normal.
- Use a feature branch only if user explicitly requests it.

STEP 2 — Propose one action:

Based on detected context, propose exactly ONE of:
a) Commit only — routine session work, no tag needed
b) Commit + tag — phase just shipped or meaningful milestone
c) Commit + push only — no tag, just sync to remote
d) Full ship — commit + tag + push

Always propose a commit message in this format:

- type: short description
- Allowed types: feat / fix / chore / docs / refactor / perf

Tag proposal rules (when tagging is chosen):

- Tag format: v[major].[minor]
- Major bump: breaking change or new phase complete
- Minor bump: new feature or meaningful improvement
- Template repos: see `.claude/rules/template-mode.md` /git section for additional tag rules and version history sync requirements.

Never commit or tag yet. Proposal first.

STEP 3 — Wait for approval:

Show exactly what will run:

git add .
git commit -m "[proposed message]"
git tag v[X.Y] (if tagging)
git push (if pushing)
git push origin v[X.Y] (if tagging)

Then ask exactly:
"Run this? (yes / edit / skip)"

If user says edit:

- Update proposal and show full command list again.
- Ask again: "Run this? (yes / edit / skip)"

If user says skip:

- State: "Skipped. No git commands executed."
- Stop.

STEP 4 — Execute on approval:

If and only if user says yes:

- Run exactly what was shown in Step 3.
- Run nothing extra.
- Confirm each command as it runs.

Final state:
"Done. [commit hash] — [tag if applied]"

RULES:

- Never run git commands without showing proposal first.
- Never amend or rebase. Always forward commits.
- Never force push.
- Never commit node_modules, .env, .env.local, or sessions/.
- If unexpected staged files exist, flag before proceeding.
- Direct commits to main for routine work. Feature branch only by explicit user request.
