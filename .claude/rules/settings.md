# Settings file rules

## settings.json vs settings.local.json

`settings.json` is committed to git — shared across all machines and devs.
`settings.local.json` is gitignored — machine-specific only.

**Rule: never add absolute path permissions to settings.json.**

Any permission containing an absolute path (e.g. `/Users/...`, `/home/...`) is machine-specific.
It must go in `settings.local.json`, not `settings.json`.

When a Bash command approval results in an absolute path being written to settings.json,
move it to settings.local.json immediately.

Prefer wildcard patterns in settings.json over hardcoded paths:
- ✅ `Bash(git status)` — in settings.json
- ✅ `Bash(git log *)` — in settings.json
- ❌ `Bash(git -C /Users/alex/myproject status)` — must be in settings.local.json

**Root cause prevention: never use `git -C /absolute/path`.**
This flag causes the absolute path to be written to settings.json when approved.
Always run git commands from within the repo — plain `git status`, `git log`, etc.
