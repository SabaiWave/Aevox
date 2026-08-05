import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import AppFooter from '@/components/layout/AppFooter'
import LandingNav from '@/components/layout/LandingNav'
import styles from './page.module.css'

export default async function HomePage() {
  const { userId } = await auth()
  const ctaHref = userId ? '/dashboard' : '/sign-up'
  const steps = [
    {
      number: '01',
      title: 'Pick a topic',
      description:
        "Type what you want to cover — that's the one creative decision Klipto asks of you. Everything else is automated.",
    },
    {
      number: '02',
      title: 'Research runs automatically',
      description:
        'Klipto combs the web and builds a structured research package: facts, sources, and angles — everything your script needs.',
    },
    {
      number: '03',
      title: 'Script writes itself',
      description:
        "A full voiceover script lands in seconds, tuned to your channel's length and style. Edit it or let it run.",
    },
    {
      number: '04',
      title: 'Narration and video assemble',
      description:
        "AI narration brings the script to life in your channel's voice. Cinematic images compose automatically with smooth motion into an upload-ready video.",
    },
    {
      number: '05',
      title: 'Live on YouTube',
      description:
        'Your video uploads straight to your YouTube channel with your title, description, and tags pre-filled. Done.',
    },
  ]

  return (
    <>
      <LandingNav />
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>For solo faceless YouTube creators</p>
          <h1 className={styles.headline}>Your video team, minus the team.</h1>
          <p className={styles.subtext}>
            Pick a topic. Klipto researches it, writes the script, narrates it, assembles the
            video, and posts it to your YouTube channel — in under 30 minutes.
          </p>
          <Link href={ctaHref} className={styles.cta}>
            {userId ? 'Go to dashboard' : 'Start free — no card needed'}
          </Link>
        </section>

        <section className={styles.howItWorks} aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" className={styles.sectionTitle}>
            How it works
          </h2>
          <div className={styles.stepsGrid}>
            {steps.map((step) => (
              <div key={step.number} className={styles.stepCard}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <AppFooter />
    </>
  )
}
