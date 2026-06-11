// NOTE: This project uses Tailwind CSS v4.
// In Tailwind v4, configuration is CSS-first via @theme inline in globals.css.
// This file is kept for reference and tooling compatibility.
// Actual design tokens are defined in src/app/globals.css.

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'surface-1': 'var(--color-surface-1)',
        'surface-2': 'var(--color-surface-2)',
        'border-1': 'var(--color-border-1)',
        'border-2': 'var(--color-border-2)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
