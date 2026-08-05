'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './page.module.css'

const faqs = [
  {
    q: 'What does "faceless YouTube channel" mean?',
    a: "No camera, no presenter on screen. Klipto produces narration-over-visuals videos. AI-generated imagery with a voiceover carries the story. The channel has a distinct identity through its voice config and script style, not through a person.",
  },
  {
    q: 'Do I need my own YouTube channel?',
    a: 'Yes. Klipto connects to your existing YouTube account via OAuth. You keep full ownership and control. Klipto handles the upload using your pre-configured title template, description, and tags.',
  },
  {
    q: 'What voice does it use for narration?',
    a: "ElevenLabs. You configure which voice to use per channel in your channel config. Your character quota is tracked and displayed on your dashboard so you always know where you stand.",
  },
  {
    q: 'How long does a full run take?',
    a: 'Under 30 minutes end to end. Research and script typically finish in under 5 minutes. Voice synthesis and video assembly take the remaining time depending on script length.',
  },
  {
    q: 'What happens if a pipeline stage fails?',
    a: "Klipto recovers what it can and keeps going. If voice fails but script succeeded, you still get the script and research output. Each stage is independent. A failure in one doesn't discard output from stages that already completed.",
  },
  {
    q: 'Can I run multiple YouTube channels?',
    a: 'Yes. Creator and Studio plans support unlimited channel configs. Each config has its own voice, script style, topic restrictions, target length, and YouTube defaults. Switch channels by selecting a different config when starting a run.',
  },
  {
    q: 'Is video assembly included on the free tier?',
    a: 'No. The free tier covers research and script (2 runs lifetime, no card required). Voice synthesis, video assembly, and YouTube auto-publish require Creator or Studio.',
  },
  {
    q: 'Can I cancel my plan anytime?',
    a: 'Yes. Cancel from your account settings whenever you want. Your plan stays active through the end of the current billing period. No partial refunds, no surprises.',
  },
]

export default function LandingFaq() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className={styles.faqList}>
      {faqs.map((item, i) => (
        <div key={i} className={styles.faqItem}>
          <button
            type="button"
            className={styles.faqButton}
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span className={styles.faqQuestion}>{item.q}</span>
            <ChevronDown
              size={16}
              aria-hidden
              className={`${styles.faqChevron}${open === i ? ` ${styles.faqChevronOpen}` : ''}`}
            />
          </button>
          {open === i && <p className={styles.faqAnswer}>{item.a}</p>}
        </div>
      ))}
    </div>
  )
}
