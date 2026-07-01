import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  appUrl: string
}

const steps = [
  { number: '01', text: 'Pick a topic and configure your channel' },
  { number: '02', text: 'AI researches, writes the script, and generates voice' },
  { number: '03', text: 'Video publishes directly to YouTube — done in under 30 min' },
]

export default function WelcomeEmail({ appUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your first video is one topic away.</Preview>
      <Body style={s.body}>
        <Container style={s.container}>

          <Text style={s.wordmark}>
            <span style={{ color: '#7c3aed' }}>{'// '}</span>KLIPTO
          </Text>

          <Text style={s.heading}>You&apos;re in.</Text>

          <Text style={s.text}>
            Faceless YouTube on autopilot. Pick a topic — Klipto handles
            research, script, voice, and publish in under 30 minutes.
          </Text>

          <Text style={s.sectionLabel}>
            <span style={{ color: '#7c3aed' }}>{'// '}</span>HOW IT WORKS
          </Text>

          {steps.map(({ number, text }) => (
            <Section key={number} style={s.stepRow}>
              <Row>
                <Column style={s.stepNumCol}>
                  <Text style={s.stepNum}>{number}</Text>
                </Column>
                <Column>
                  <Text style={s.stepText}>{text}</Text>
                </Column>
              </Row>
            </Section>
          ))}

          <Section style={s.btnSection}>
            <Button href={`${appUrl}/video/new`} style={s.btn}>
              CREATE YOUR FIRST VIDEO
            </Button>
          </Section>

          <Text style={s.footer}>© 2026 klipto.studio</Text>

        </Container>
      </Body>
    </Html>
  )
}

const s = {
  body: {
    backgroundColor: '#0f0f0f',
    fontFamily: "'Geist', Helvetica, Arial, sans-serif",
  },
  container: {
    backgroundColor: '#111111',
    borderRadius: '8px',
    border: '1px solid #222222',
    margin: '40px auto',
    padding: '40px',
    maxWidth: '560px',
  },
  wordmark: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    margin: '0 0 32px',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  heading: {
    color: '#ffffff',
    fontSize: '36px',
    fontWeight: '700',
    lineHeight: '1.2',
    margin: '0 0 12px',
    fontFamily: "'Space Grotesk', Helvetica, Arial, sans-serif",
  },
  text: {
    color: '#a1a1aa',
    fontSize: '15px',
    lineHeight: '1.75',
    margin: '0 0 32px',
    fontFamily: "'Geist', Helvetica, Arial, sans-serif",
  },
  sectionLabel: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    margin: '0 0 16px',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  stepRow: {
    margin: '0 0 12px',
  },
  stepNumCol: {
    width: '32px',
    verticalAlign: 'top' as const,
  },
  stepNum: {
    color: '#7c3aed',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  stepText: {
    color: '#a1a1aa',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0',
    fontFamily: "'Geist', Helvetica, Arial, sans-serif",
  },
  btnSection: {
    margin: '32px 0 0',
  },
  btn: {
    backgroundColor: '#7c3aed',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    padding: '12px 24px',
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  footer: {
    color: '#71717a',
    fontSize: '14px',
    margin: '28px 0 0',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
}
