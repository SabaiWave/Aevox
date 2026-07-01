'use client'

import { useState } from 'react'
import styles from './contact.module.css'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })

      if (!res.ok) {
        throw new Error(res.status === 429 ? 'Too many messages sent. Please wait a moment and try again.' : 'Something went wrong. Please try again.')
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.successPanel}>
        <p className={styles.successLabel}>Message sent</p>
        <p className={styles.successBody}>
          We received your message and will reply to {email} shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>Name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={e => setName(e.target.value)}
          className={styles.input}
          disabled={status === 'loading'}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={styles.input}
          disabled={status === 'loading'}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="message" className={styles.label}>Message</label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={2000}
          rows={6}
          value={message}
          onChange={e => setMessage(e.target.value)}
          className={styles.textarea}
          disabled={status === 'loading'}
        />
      </div>

      {status === 'error' && (
        <div className={styles.errorPanel}>
          <p className={styles.errorMessage}>{errorMsg}</p>
        </div>
      )}

      <button type="submit" className={styles.button} disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
