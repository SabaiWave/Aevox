import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // TODO: convert to Tailwind utilities before launch
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {children}
    </div>
  )
}
