import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import AppFooter from '@/components/layout/AppFooter'
import LandingNav from '@/components/layout/LandingNav'
import LandingFaq from './LandingFaq'
import styles from './page.module.css'

const pipelineStages = ['Research', 'Script', 'Voice', 'Video', 'Publish']

const features = [
  {
    tag: 'PIPELINE',
    title: 'End-to-end, no assembly',
    description:
      'Research, script, narration, video, and YouTube upload run as a single pipeline. Pick a topic. Nothing to string together after.',
  },
  {
    tag: 'CONFIGURATION',
    title: 'Per-channel precision',
    description:
      "Every channel runs its own config: voice, script style, topic restrictions, target length, and YouTube defaults. Switch channels, switch everything.",
  },
  {
    tag: 'RELIABILITY',
    title: 'Staged recovery',
    description:
      "When a stage fails, Klipto recovers what it can and keeps going. A voice error doesn't erase your script. Each stage is independent.",
  },
]

const steps = [
  {
    number: '01',
    title: 'Pick a topic',
    description:
      "Type what you want to cover. That's the one creative decision Klipto asks of you. Everything else is automated.",
  },
  {
    number: '02',
    title: 'Research runs automatically',
    description:
      'Klipto combs the web and builds a structured research package: facts, sources, and angles. Everything your script needs.',
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

const plans = [
  {
    name: 'Free',
    price: '$0',
    note: 'forever',
    tag: 'NO CARD',
    description: '2 lifetime runs to see the pipeline in action.',
    features: [
      '2 lifetime runs',
      'Research + script pipeline',
      'No voice or video generation',
      'No credit card required',
    ],
    highlight: false,
  },
  {
    name: 'Creator',
    price: '$49',
    note: '/mo',
    tag: 'MOST POPULAR',
    description: 'The full pipeline, 8 times a month.',
    features: [
      '8 videos per month',
      'Full pipeline: research, script, voice, video',
      'YouTube auto-publish',
      'Unlimited channel configs',
    ],
    highlight: true,
  },
  {
    name: 'Studio',
    price: '$99',
    note: '/mo',
    tag: 'UNLIMITED',
    description: 'Unlimited runs for creators shipping at volume.',
    features: [
      'Unlimited videos per month',
      'Everything in Creator',
      'Priority processing',
      'Early access to new formats',
    ],
    highlight: false,
  },
]

export default async function HomePage() {
  const { userId } = await auth()
  const ctaHref = userId ? '/dashboard' : '/sign-up'
  const pricingCtaHref = userId ? '/upgrade' : '/sign-up'

  return (
    <>
      <LandingNav />
      <main className={styles.main}>

        {/* Hero */}
        <div className={styles.heroSection}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>For solo faceless YouTube creators</p>
            <h1 className={styles.headline}>Your video team, minus the team.</h1>
            <p className={styles.subtext}>
              Pick a topic. Klipto researches it, writes the script, narrates it, assembles the
              video, and posts it to your YouTube channel. Under 30 minutes.
            </p>
            <div className={styles.ctaRow}>
              <Link href={ctaHref} className={styles.cta}>
                {userId ? 'Go to dashboard' : 'Start free, no card needed'}
              </Link>
              {!userId && (
                <Link href="#pricing" className={styles.ctaSecondary}>
                  See pricing
                </Link>
              )}
            </div>
            <div className={styles.pipelineStrip} aria-hidden="true">
              {pipelineStages.map((stage, i) => (
                <span key={stage} className={styles.pipelineStageRow}>
                  <span className={styles.pipelineStage}>{stage}</span>
                  {i < pipelineStages.length - 1 && (
                    <ArrowRight size={10} className={styles.pipelineArrow} />
                  )}
                </span>
              ))}
            </div>
          </section>
        </div>

        {/* Features */}
        <section
          className={`${styles.sectionPadded} ${styles.sectionAlt}`}
          aria-labelledby="features-heading"
        >
          <div className={styles.sectionContent}>
            <div className={styles.sectionHeader}>
              <h2 id="features-heading" className={styles.sectionTitle}>
                Built for creators who ship
              </h2>
              <p className={styles.sectionSubtitle}>
                Not a content assistant. A production pipeline that runs start to finish without
                you in the loop.
              </p>
            </div>
            <div className={styles.featuresGrid}>
              {features.map((f) => (
                <div key={f.tag} className={styles.featureCard}>
                  <p className={styles.featureTag}>{f.tag}</p>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureDescription}>{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className={styles.sectionPadded} aria-labelledby="how-it-works-heading">
          <div className={styles.sectionContent}>
            <div className={styles.sectionHeader}>
              <h2 id="how-it-works-heading" className={styles.sectionTitle}>
                How it works
              </h2>
            </div>
            <div className={styles.stepsGrid}>
              {steps.map((step) => (
                <div key={step.number} className={styles.stepCard}>
                  <span className={styles.stepNumber}>{step.number}</span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className={`${styles.sectionPadded} ${styles.sectionAlt}`}
          aria-labelledby="pricing-heading"
        >
          <div className={styles.sectionContent}>
            <div className={styles.sectionHeader}>
              <h2 id="pricing-heading" className={styles.sectionTitle}>
                Pricing
              </h2>
              <p className={styles.sectionSubtitle}>
                Start free. Upgrade when you're ready to ship at volume.
              </p>
            </div>
            <div className={styles.pricingGrid}>
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`${styles.pricingCard} ${plan.highlight ? styles.pricingCardHighlight : ''}`}
                >
                  <div className={styles.pricingCardHeader}>
                    <span className={styles.pricingPlanName}>{plan.name}</span>
                    <span
                      className={`${styles.pricingTag} ${plan.highlight ? styles.pricingTagHighlight : ''}`}
                    >
                      {plan.tag}
                    </span>
                  </div>
                  <div className={styles.pricingPriceRow}>
                    <span className={styles.pricingPrice}>{plan.price}</span>
                    <span className={styles.pricingNote}>{plan.note}</span>
                  </div>
                  <p className={styles.pricingDescription}>{plan.description}</p>
                  <ul className={styles.pricingFeatureList}>
                    {plan.features.map((f) => (
                      <li key={f} className={styles.pricingFeatureItem}>
                        <span className={styles.pricingCheck} aria-hidden="true">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={pricingCtaHref}
                    className={plan.highlight ? styles.cta : styles.ctaGhost}
                  >
                    {plan.name === 'Free' ? 'Start free' : `Get ${plan.name}`}
                  </Link>
                </div>
              ))}
            </div>
            <p className={styles.pricingFootnote}>
              All plans billed monthly. Cancel anytime. No partial refunds.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.sectionPadded} aria-labelledby="faq-heading">
          <div className={styles.sectionContent}>
            <div className={styles.sectionHeader}>
              <h2 id="faq-heading" className={styles.sectionTitle}>
                Common questions
              </h2>
            </div>
            <div className={styles.faqWrap}>
              <LandingFaq />
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={`${styles.sectionPadded} ${styles.sectionAlt}`}>
          <div className={`${styles.sectionContent} ${styles.bottomCta}`}>
            <h2 className={styles.bottomCtaTitle}>Ship your first video today.</h2>
            <p className={styles.bottomCtaText}>
              2 free runs, no credit card. See the full pipeline in action.
            </p>
            <Link href={ctaHref} className={styles.cta}>
              {userId ? 'Go to dashboard' : 'Get started free'}
            </Link>
          </div>
        </section>

      </main>
      <AppFooter />
    </>
  )
}
