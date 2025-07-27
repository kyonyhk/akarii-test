'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useUser } from '@/hooks/useUser'
import { UserResource } from '@clerk/types'
import { Id } from '@/convex/_generated/dataModel'

interface AuthContextType {
  clerkUser: UserResource | null | undefined
  convexUser:
    | {
        _id: Id<'users'>
        clerkId: string
        email: string
        name?: string
        avatar?: string
        role: 'admin' | 'user' | 'guest' | 'member'
        joinedAt: number
      }
    | null
    | undefined
  isLoaded: boolean
  isSignedIn: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { clerkUser, convexUser, isLoaded, isSignedIn } = useUser()

  const value: AuthContextType = {
    clerkUser,
    convexUser,
    isLoaded,
    isSignedIn,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAppAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAppAuth must be used within an AuthProvider')
  }
  return context
}
