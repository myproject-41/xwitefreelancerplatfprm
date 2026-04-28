import './globals.css'
import type { Metadata, Viewport } from 'next'
import PwaRegister from '../components/PwaRegister'

export const viewport: Viewport = {
  themeColor: '#005d8f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'Xwite — Freelance Platform',
  description: 'Connect with top freelancers and clients. Find tasks, send proposals, and manage work.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Xwite',
  },
  icons: {
    icon: '/xwiteprofile.png',
    apple: '/xwiteprofile.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA splash / status bar */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/xwiteprofile.png" />
      </head>
      <body style={{
        fontFamily: 'Manrope, Inter, sans-serif',
        background: '#f9f9ff',
        color: '#101b30',
        margin: 0,
        padding: 0,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
