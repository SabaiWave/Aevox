import Link from 'next/link'
import AppFooter from '@/components/layout/AppFooter'
import styles from './page.module.css'

export default function HomePage() {
  const steps = [
    {
      number: '01',
      title: 'Research',
      description: 'Give it a topic. Tavily finds and structures sources from across the web.',
    },
    {
      number: '02',
      title: 'Script',
      description: 'Claude writes a channel-tuned script from the research package.',
    },
    {
      number: '03',
      title: 'Voice',
      description: 'ElevenLabs synthesizes narration in your channel’s voice as an MP3.',
    },
    {
      number: '04',
      title: 'Publish',
      description: 'Uploads straight to YouTube with your channel’s metadata defaults.',
    },
  ]

  return (
    <>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>For solo faceless YouTube creators</p>
          <h1 className={styles.headline}>Topic in. Researched, scripted, voiced, published.</h1>
          <p className={styles.subtext}>
            Klipto turns a topic into a researched script, narrated MP3, and a published YouTube
            video in under 30 minutes.
          </p>
          <Link href="/sign-up" className={styles.cta}>
            Start free
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
