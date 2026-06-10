---
paths:
  - "app/**/*.tsx"
  - "app/**/*.ts"
  - "src/emails/**/*.tsx"
---

> Before any UI work, read `.claude/skills/impeccable/SKILL.md`. All frontend output must meet those standards.

# Frontend rules

## Component architecture
- Functional components + hooks only. No class components.
- Colocate component + styles + tests where possible.
- Extract shared UI into app/components/ui/ — never duplicate primitives.
- Use shadcn/ui for base components. Never build from scratch.

## Styling
- Tailwind CSS only. No inline styles except Canvas elements.
- Exception: CSS custom property values require inline `style` prop — Tailwind cannot interpolate `var(--color-*)` dynamically. Use `style={{ color: 'var(--color-secondary)' }}` for design tokens. This is not a Tailwind violation.
- Dark mode first. Light mode via overrides.
- Use CSS custom properties (var(--color-*)) for all brand colors.
- Use cn() helper for conditional classes.
- Never hardcode hex values in component files — use design tokens.

## State management
- Local state: useState / useReducer.
- Global state: Zustand for cross-component state. React Context for theme/auth only.
- No prop drilling beyond 2 levels — lift state or use context.

## Images
- next/image for all images. No bare <img> tags.

## Typography
- Font variables via var(--font-*). Never hardcode font names in components.
- Exception: app/layout.tsx and PDF templates may hardcode font names.

## Icons
- Lucide React (default). Override per project in CLAUDE.md if different.
- Never mix icon libraries within a project.

## Routing
- Use Next.js App Router conventions.
- No client-side redirects in server components.
