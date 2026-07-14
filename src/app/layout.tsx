import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Klipto',
  description: 'Config-driven content pipeline for faceless YouTube creators',
}

const clerkAppearance = {
  variables: {
    fontFamily: "'Geist', system-ui, sans-serif",
    colorPrimary: '#7c3aed',
    colorTextOnPrimaryBackground: '#ffffff',
    borderRadius: '0.5rem',
    colorBackground: '#111111',
    colorInputBackground: '#161616',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#a1a1aa',
  },
  elements: {
    card: { backgroundColor: '#111111', borderColor: '#222222' },
    navbar: { backgroundColor: '#0a0a0a', borderColor: '#222222' },
    navbarHeader: { color: '#ffffff', opacity: 1 },
    navbarHeaderTitle: { color: '#ffffff' },
    navbarHeaderDescription: { color: '#a1a1aa' },
    navbarButton: { color: '#ffffff' },
    navbarButtonIcon: { color: '#a1a1aa' },
    pageScrollBox: { backgroundColor: '#111111' },
    headerTitle: { color: '#ffffff' },
    headerSubtitle: { color: '#a1a1aa' },
    formFieldLabel: { color: '#a1a1aa' },
    formFieldHintText: { color: '#71717a' },
    formFieldInput: { backgroundColor: '#161616', borderColor: '#2a2a2a', color: '#ffffff' },
    dividerText: { color: '#71717a' },
    dividerLine: { backgroundColor: '#2a2a2a' },
    socialButtonsBlockButton: { backgroundColor: '#161616', borderColor: '#2a2a2a', color: '#ffffff' },
    socialButtonsBlockButtonText: { color: '#ffffff' },
    footerActionText: { color: '#d4d4d8' },
    footerActionLink: { color: '#a78bfa' },
    footer: { color: '#71717a' },
    profileSectionTitle: { color: '#ffffff', borderColor: '#222222' },
    profileSectionSubtitle: { color: '#a1a1aa' },
    profileSectionContent: { color: '#ffffff' },
    profileSectionPrimaryButton: { color: '#7c3aed' },
    profileSectionItem: { borderColor: '#222222' },
    profileSectionTitleText: { color: '#ffffff' },
    accordionTriggerButton: { color: '#ffffff' },
    badge: { color: '#ffffff', backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' },
    badgePrimary: { color: '#ffffff', backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a' },
    tableHead: { color: '#a1a1aa' },
    identityPreviewText: { color: '#ffffff' },
    formattedEmailAddress: { color: '#ffffff' },
    userEmailAddress: { color: '#ffffff' },
    identityPreviewEditButton: { color: '#7c3aed' },
    identityPreviewEditButtonIcon: { color: '#a1a1aa' },
    pageHeader: { color: '#ffffff' },
    pageHeaderTitle: { color: '#ffffff' },
    pageHeaderSubtitle: { color: '#a1a1aa' },
    formattedDate: { color: '#a1a1aa' },
    activeDevice: { borderColor: '#222222', color: '#ffffff' },
    activeDeviceListItem: { borderColor: '#222222', color: '#ffffff' },
    activeDeviceBrowser: { color: '#a1a1aa' },
    activeDeviceIpAddress: { color: '#a1a1aa' },
    activeDeviceLastActive: { color: '#71717a' },
  },
}

const clerkLocalization = {
  userProfile: {
    deletePage: {
      title: 'Delete account',
      messageLine1: 'Your account will be permanently deleted.',
      messageLine2: 'This action cannot be undone.',
      actionDescription: 'Type "Delete account" below to continue.',
      confirm: 'DELETE ACCOUNT',
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in" appearance={clerkAppearance} localization={clerkLocalization}>
      <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
