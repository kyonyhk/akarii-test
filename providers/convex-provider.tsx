'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ReactNode } from 'react'

// Create a dummy client for development
const dummyConvex = new ConvexReactClient('https://dummy.convex.cloud')

// Initialize Convex client with fallback for development
const convex = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  : dummyConvex

interface ConvexClientProviderProps {
  children: ReactNode
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  // Always provide a ConvexProvider, even with dummy client
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    console.warn(
      'Convex URL not configured. Using dummy client for development. Set NEXT_PUBLIC_CONVEX_URL in your .env.local file.'
    )
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
