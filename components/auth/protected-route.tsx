'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  requiredRole?: 'member' | 'admin'
  fallback?: React.ReactNode
}

export function ProtectedRoute({
  children,
  redirectTo = '/sign-in',
  requiredRole,
  fallback,
}: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.push(redirectTo)
      return
    }

    // If role-based access is required, check user role
    if (requiredRole && user) {
      const userRole = user.publicMetadata?.role as string
      if (userRole !== requiredRole && userRole !== 'admin') {
        // Admin users can access all routes
        router.push('/chat') // Redirect to default authorized page
        return
      }
    }

    setIsChecking(false)
  }, [isSignedIn, isLoaded, user, router, redirectTo, requiredRole])

  // Show loading state while checking authentication
  if (!isLoaded || isChecking) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting
  if (!isSignedIn) {
    return null
  }

  // If role-based access is required and user doesn't have permission
  if (requiredRole && user) {
    const userRole = user.publicMetadata?.role as string
    if (userRole !== requiredRole && userRole !== 'admin') {
      return null
    }
  }

  return <>{children}</>
}
