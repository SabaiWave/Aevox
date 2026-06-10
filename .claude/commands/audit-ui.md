---
name: audit-ui
description: Audit all app/ files against DESIGN.md and rules/frontend.md — flags inline patterns, hardcoded values, and component violations. Run any time mid-phase to catch UI drift before it accumulates.
---

Read DESIGN.md and rules/frontend.md in full before starting.

Scan every .tsx and .ts file in app/ (excluding node_modules, .next, generated files).
Also scan src/ if it contains UI-related files.

Check each file against DESIGN.md component registry and rules/frontend.md enforcement rules.

COMPONENT VIOLATIONS — patterns that must use a registered component:
- Inline heading pattern (raw JSX string or span) instead of registered heading component
- Bare <UserButton /> instead of project-specific UserButton wrapper
- Raw <button> element outside app/components/ui/ — if Button import missing, append "(Button import missing)"
- Styled <Link> with background/border outside app/components/ui/
- Wordmark pattern written inline instead of <Wordmark>
- Footer links written inline instead of <FooterLink>

HARDCODED VALUES — values that must use CSS tokens:
- Hardcoded font names in component files outside app/layout.tsx and src/lib/pdfTemplate.ts
- Hardcoded rgba() shadow values in JSX style props — must use CSS var tokens
- Hardcoded hex color values in JSX style props — must use var(--color-*)

THEME VIOLATIONS:
- [data-theme="light"] selector without html prefix — must be html[data-theme="light"]
- var(--color-primary) used as text color on a colored background
- disableTransitionOnChange on ThemeProvider

LIGHT MODE CONTRAST:
- Cross-check light-mode text color token values in DESIGN.md against WCAG AA (4.5:1 for normal text, 3:1 for large text/bold ≥14px)
- Flag any tertiary or muted text token whose documented light-mode hex value falls below 4.5:1 on white (#FFFFFF)
- Monospace fonts render visually thinner at the same hex value — flag tertiary tokens used for mono metadata that pass barely on proportional text but fail perceptually on mono

TYPOGRAPHY VIOLATIONS:
- letterSpacing above 0.04em on any multi-word string
- font-family set to a literal font name instead of var(--font-*)

CLERK VIOLATIONS (if using Clerk):
- ClerkProvider appearance config inline in layout.tsx — must be in ThemeProvider component
- Bare <UserButton /> without project wrapper

Output format:

## UI Audit — [date]

### VIOLATIONS (fix before continuing)
[file path]:[line approx] — [description of violation]

### WARNINGS (review before phase complete)
[file path]:[line approx] — [description]

### PASS
[X] files scanned. [Y] violations. [Z] warnings.

Rules:
- File path for every finding. Line number where determinable.
- Do not fix anything. Report only. Wait for instruction.
- Skip fixtures, tests, and generated files.

State: "UI audit complete. X violations found. Ready for fixes or continue?"

AI SLOP CLASSIFICATION NOTE:
AI slop patterns (eyebrow pills above sections, numbered section markers, identical repeating cards) are violations ONLY when the same pattern repeats across 3+ sections site-wide.
A single deliberate instance is voice, not slop. Do not flag a hero eyebrow, a single pill badge, or one numbered sequence as AI slop — flag only when the same visual grammar appears on every section regardless of context.
