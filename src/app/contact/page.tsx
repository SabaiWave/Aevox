import AppFooter from '@/components/layout/AppFooter'
import LandingNav from '@/components/layout/LandingNav'
import ContactForm from './ContactForm'
import styles from './contact.module.css'

export const metadata = {
  title: 'Contact — Klipto',
}

export default function ContactPage() {
  return (
    <>
      <LandingNav />
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Contact</h1>
            <p className={styles.subtitle}>Questions, bug reports, feedback, or partnership inquiries.</p>
          </div>
          <ContactForm />
        </div>
      </div>
      <AppFooter />
    </>
  )
}
