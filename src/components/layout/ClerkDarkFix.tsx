'use client'

import { useEffect } from 'react'

// Clerk lazily injects <style> tags when components mount/open, always after ours.
// MutationObserver re-appends our override LAST after each Clerk injection so we win the cascade.
// html body prefix raises specificity to beat Clerk's single-class selectors.
export function ClerkDarkFix() {
  useEffect(() => {
    const id = 'klipto-clerk-dark-fix'

    function reinsert() {
      const existing = document.getElementById(id)
      if (existing) existing.remove()
      const el = document.createElement('style')
      el.id = id
      el.textContent = `
        html body [class*="cl-"] {
          --cl-color-text: #ffffff !important;
          font-family: var(--font-geist-sans), system-ui, sans-serif !important;
          opacity: 1 !important;
        }
        html body [class*="cl-navbar"],
        html body [class*="cl-navbar"] * {
          color: #ffffff !important;
          opacity: 1 !important;
        }
        html body .cl-navbarButton,
        html body .cl-navbarButton * {
          color: #a1a1aa !important;
        }
        html body .cl-navbarButton:hover,
        html body .cl-navbarButton:hover * {
          color: #ffffff !important;
          background-color: rgba(124,58,237,0.12) !important;
        }
        html body [class*="cl-userProfile"],
        html body [class*="cl-userProfile"] * {
          opacity: 1 !important;
        }
        html body .cl-card,
        html body .cl-modal,
        html body .cl-modalContent {
          opacity: 1 !important;
        }
        html body .cl-profileSectionContent,
        html body .cl-profileSectionContent * {
          color: #a1a1aa !important;
          opacity: 1 !important;
        }
        html body .cl-profileSectionTitle,
        html body .cl-profileSectionTitle * {
          color: #ffffff !important;
          opacity: 1 !important;
        }
        html body .cl-closeButton,
        html body .cl-modalCloseButton {
          color: #a1a1aa !important;
          opacity: 1 !important;
        }
        html body .cl-userButtonPopoverCard,
        html body .cl-userButtonPopoverCard * {
          color: #ffffff !important;
          opacity: 1 !important;
        }
      `
      document.head.appendChild(el)
    }

    reinsert()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if ((node as Element).tagName === 'STYLE' && (node as Element).id !== id) {
            reinsert()
            return
          }
        }
      }
    })

    observer.observe(document.head, { childList: true })
    return () => observer.disconnect()
  }, [])

  return null
}
