import type { Metadata } from 'next'
import { Orbitron, Share_Tech_Mono } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { ConvexClientProvider } from '@/providers/convex-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { Toaster } from 'sonner'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
})

const sharetech = Share_Tech_Mono({
  subsets: ['latin'],
  variable: '--font-sharetech',
  weight: '400',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Akarii - Real-time Chat Analysis',
  description: 'AI-powered real-time message analysis platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${orbitron.variable} ${sharetech.variable} font-sans`}
        >
          <ConvexClientProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConvexClientProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
