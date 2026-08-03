import Link from 'next/link'
import AppFooter from '@/components/layout/AppFooter'
import LandingNav from '@/components/layout/LandingNav'
import styles from './privacy.module.css'

export const metadata = {
  title: 'Privacy Policy — Klipto',
}

export default function PrivacyPage() {
  return (
    <>
      <LandingNav />
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.lastUpdated}>Last updated: July 2026</p>
          </div>

          <p className={styles.intro}>
            This Privacy Policy describes how Klipto (operated by Sabai Wave LLC) collects, uses,
            and protects your information when you use our service. By using Klipto, you agree to
            the collection and use of information in accordance with this policy.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
            <p className={styles.sectionBody}>
              <strong>Account information:</strong> Email address and name provided during sign-up.
              Our authentication provider also collects IP address, device type, and browser
              information as part of the sign-in process.
              <br /><br />
              <strong>Channel configurations:</strong> Voice IDs, YouTube channel preferences, and
              content style settings you configure in Klipto.
              <br /><br />
              <strong>Pipeline run data:</strong> Topics you submit, research results, generated
              scripts, voice MP3 files, and YouTube video metadata produced during pipeline runs.
              <br /><br />
              <strong>YouTube OAuth tokens:</strong> When you connect a YouTube channel, we store
              your OAuth access and refresh tokens encrypted in our database. These are used solely
              to publish videos on your behalf and are never exposed client-side.
              <br /><br />
              <strong>Payment information:</strong> Payment is processed by Stripe. We do not store
              card numbers or full payment details. Stripe may collect billing name and payment
              method metadata per their privacy policy.
              <br /><br />
              <strong>Usage data:</strong> Pipeline run counts, ElevenLabs character quota usage,
              and subscription status to enforce plan limits.
              <br /><br />
              <strong>Error and performance data:</strong> When errors occur, diagnostic information
              (stack traces, request context, browser version) is collected for debugging via our
              error monitoring and logging services.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. What We Do Not Collect</h2>
            <p className={styles.sectionBody}>
              We do not collect passport numbers, date of birth, physical address, or any
              government-issued identification numbers. We do not store payment card numbers — those
              are handled entirely by Stripe. We do not sell your personal information to third
              parties.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. How We Use Your Information</h2>
            <p className={styles.sectionBody}>
              We use the information we collect to:
              <br /><br />
              • Run your content pipeline (research, script generation, voice synthesis, YouTube publishing)
              <br />
              • Manage your subscription and enforce plan quota limits
              <br />
              • Send transactional emails (welcome, billing receipts, account-related notices)
              <br />
              • Improve the reliability and performance of the service
              <br />
              • Comply with legal obligations
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Third-Party Service Providers</h2>
            <p className={styles.sectionBody}>
              We share data only with service providers necessary to operate Klipto. These providers
              process data under their own privacy policies and are not permitted to use your data for
              other purposes.
              <br /><br />
              • <strong>AI processing provider</strong> — topic and research content are sent to generate scripts
              <br />
              • <strong>Web research provider</strong> — topic is sent to gather structured sources from the web
              <br />
              • <strong>Voice synthesis provider</strong> — script text is sent to generate MP3 narration
              <br />
              • <strong>Google / YouTube</strong> — Klipto uses YouTube API Services to publish videos to your channel using your OAuth credentials. Your use of YouTube features is also subject to{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={styles.link}>Google&apos;s Privacy Policy</a>.
              <br />
              • <strong>Authentication provider</strong> — manages sign-up, login, and session security (email, name, device info, IP address)
              <br />
              • <strong>Stripe</strong> — payment processing (billing info and subscription management)
              <br />
              • <strong>Database and storage provider</strong> — stores all account, config, and run data
              <br />
              • <strong>Error monitoring service</strong> — collects anonymized error context and stack traces for debugging
              <br />
              • <strong>Server logging service</strong> — collects operational logs and request metadata
              <br />
              • <strong>Email delivery service</strong> — sends transactional emails on our behalf
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Data Retention</h2>
            <p className={styles.sectionBody}>
              We retain your account information and channel configurations for as long as your
              account is active. Pipeline run data (scripts, research, MP3 references) is retained
              indefinitely to allow you to review past runs. Generated MP3 files stored in Supabase
              Storage are retained for 90 days by default. YouTube OAuth tokens are retained until
              you disconnect your channel or delete your account. You may request deletion of your
              data at any time by contacting us.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Your Rights (GDPR / EEA Users)</h2>
            <p className={styles.sectionBody}>
              If you are located in the EU or EEA, you have the following rights under the GDPR:
              <br /><br />
              • <strong>Access</strong> — request a copy of the personal data we hold about you
              <br />
              • <strong>Rectification</strong> — request correction of inaccurate data
              <br />
              • <strong>Erasure</strong> — request deletion of your account and associated data
              <br />
              • <strong>Portability</strong> — request your data in a machine-readable format
              <br />
              • <strong>Restriction</strong> — request that we limit processing of your data
              <br />
              • <strong>Object</strong> — object to processing based on legitimate interests
              <br /><br />
              To exercise any of these rights, contact us via our{' '}
              <Link href="/contact" className={styles.link}>contact form</Link>. We will respond
              within 30 days.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. California Privacy Rights (CCPA)</h2>
            <p className={styles.sectionBody}>
              If you are a California resident, you have the right to know what personal information
              is collected about you, request deletion of your personal information, and opt out of
              the sale of your personal information. <strong>We do not sell your personal
              information.</strong> To exercise your rights, contact us via our{' '}
              <Link href="/contact" className={styles.link}>contact form</Link>.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Cookies</h2>
            <p className={styles.sectionBody}>
              We use session cookies required for authentication (Clerk). We do not use advertising
              cookies or third-party tracking cookies.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Security</h2>
            <p className={styles.sectionBody}>
              All data is encrypted in transit. YouTube OAuth tokens are encrypted at rest.
              Access to stored data is restricted via Row Level Security policies on our database.
              We do not expose user data to the client beyond what is necessary to render your
              account.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>10. Changes to This Policy</h2>
            <p className={styles.sectionBody}>
              We will notify registered users of material changes to this policy via email.
              Continued use of the service after changes constitutes acceptance of the revised policy.
              The &ldquo;Last updated&rdquo; date at the top of this page reflects when the policy
              was last revised.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>11. Contact</h2>
            <p className={styles.sectionBody}>
              Privacy questions? Contact us via our{' '}
              <Link href="/contact" className={styles.link}>contact form</Link> or email{' '}
              <a href="mailto:privacy@klipto.ai" className={styles.link}>
                privacy@klipto.ai
              </a>
              .
            </p>
          </section>
        </div>
      </div>
      <AppFooter />
    </>
  )
}
