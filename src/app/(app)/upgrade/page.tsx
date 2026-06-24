import UpgradeButton from './UpgradeButton'

const starterFeatures = [
  '8 videos per month',
  'Full research + script + voice pipeline',
  'YouTube auto-publish',
  'ElevenLabs voice synthesis',
]

const proFeatures = [
  'Unlimited videos',
  'Everything in Starter',
  'Priority processing',
  'Early access to new features',
]

export default function UpgradePage() {
  const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID!
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID!

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: '0 0 0.5rem',
        }}
      >
        Upgrade
      </h1>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          margin: '0 0 2rem',
        }}
      >
        Choose a plan to keep creating
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        {/* Starter */}
        <div
          style={{
            flex: '1 1 280px',
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-1)',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '1.125rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              Starter
            </p>
            <p style={{ margin: 0 }}>
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}
              >
                $49
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                /mo
              </span>
            </p>
          </div>

          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {starterFeatures.map(feature => (
              <li
                key={feature}
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: 'var(--color-status-complete)', flexShrink: 0 }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <UpgradeButton priceId={starterPriceId} label="Get Starter" />
        </div>

        {/* Pro */}
        <div
          style={{
            flex: '1 1 280px',
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-1)',
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '1.125rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              Pro
            </p>
            <p style={{ margin: 0 }}>
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}
              >
                $99
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                /mo
              </span>
            </p>
          </div>

          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {proFeatures.map(feature => (
              <li
                key={feature}
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: 'var(--color-status-complete)', flexShrink: 0 }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <UpgradeButton priceId={proPriceId} label="Get Pro" />
        </div>
      </div>
    </div>
  )
}
