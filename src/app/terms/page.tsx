import AppFooter from '@/components/layout/AppFooter'
import styles from './terms.module.css'

export const metadata = {
  title: 'Terms of Service — Klipto',
}

export default function TermsPage() {
  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Terms of Service</h1>
            <p className={styles.lastUpdated}>Last updated: June 2026</p>
          </div>

          <p className={styles.intro}>
            [PLACEHOLDER — Replace this section with your actual terms of service before launch.]
            Please read these Terms of Service carefully before using Klipto. By accessing or using
            our service, you agree to be bound by these terms.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Acceptance of Terms</h2>
            <p className={styles.sectionBody}>
              [PLACEHOLDER] By creating an account or using Klipto, you agree to these Terms of
              Service and our Privacy Policy. If you do not agree to these terms, you may not use
              our service. These terms may be updated periodically and continued use of the service
              constitutes acceptance of the revised terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Use of Service</h2>
            <p className={styles.sectionBody}>
              [PLACEHOLDER] You may use Klipto only for lawful purposes and in accordance with these
              terms. You are responsible for all content generated through your account and for
              ensuring your use complies with applicable laws and third-party platform policies,
              including YouTube&apos;s Terms of Service. You may not use the service to generate
              misleading, harmful, or infringing content.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Billing and Payments</h2>
            <p className={styles.sectionBody}>
              [PLACEHOLDER] Paid plans are billed monthly or annually as selected at checkout.
              Subscription fees are charged in advance and are non-refundable except where required
              by law. You may cancel your subscription at any time; cancellation takes effect at the
              end of the current billing period. We reserve the right to modify pricing with
              reasonable notice.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Termination</h2>
            <p className={styles.sectionBody}>
              [PLACEHOLDER] We reserve the right to suspend or terminate your account at our
              discretion if you violate these terms or engage in activity harmful to other users or
              the service. You may terminate your account at any time by contacting support. Upon
              termination, your access to the service will cease and your data may be deleted in
              accordance with our data retention policy.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Us</h2>
            <p className={styles.sectionBody}>
              For questions about these terms, contact us at{' '}
              <a href="mailto:legal@klipto.ai" className={styles.link}>
                legal@klipto.ai
              </a>
            </p>
          </section>
        </div>
      </div>
      <AppFooter />
    </>
  )
}
