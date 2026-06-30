import AppFooter from '@/components/layout/AppFooter'
import styles from './privacy.module.css'

export const metadata = {
  title: 'Privacy Policy — Klipto',
}

export default function PrivacyPage() {
  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.lastUpdated}>Last updated: June 2026</p>
          </div>

          <p className={styles.intro}>
            [PLACEHOLDER — Replace this section with your actual privacy policy before launch.]
            This Privacy Policy describes how Klipto collects, uses, and protects your information
            when you use our service.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Information We Collect</h2>
            <p className={styles.sectionBody}>
              [PLACEHOLDER] We collect information you provide directly to us, such as account
              registration details, channel configurations, and content preferences. We also
              automatically collect certain technical information when you use our service, including
              usage data and pipeline run logs to improve reliability and performance.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How We Use Your Information</h2>
            <p className={styles.sectionBody}>
              [PLACEHOLDER] We use the information we collect to provide, maintain, and improve our
              services, process your content pipeline runs, manage your subscription, send you
              service-related communications, and comply with legal obligations. We do not sell your
              personal information to third parties.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Data Retention</h2>
            <p className={styles.sectionBody}>
              [PLACEHOLDER] We retain your account information and content for as long as your account
              is active or as needed to provide services. Pipeline run data and generated content are
              retained for a period of 90 days by default. You may request deletion of your data at
              any time by contacting us.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Contact Us</h2>
            <p className={styles.sectionBody}>
              For privacy questions, contact us at{' '}
              <a href="mailto:privacy@klipto.ai" className={styles.link}>
                privacy@klipto.ai
              </a>
            </p>
          </section>
        </div>
      </div>
      <AppFooter />
    </>
  )
}
