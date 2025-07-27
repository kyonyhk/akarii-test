import { useUser as useClerkUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect } from 'react'

export function useUser() {
  const { user: clerkUser, isLoaded } = useClerkUser()
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser)
  const currentUser = useQuery(api.users.getCurrentUser, {
    clerkId: clerkUser?.id,
  })

  useEffect(() => {
    if (isLoaded && clerkUser) {
      // Get role from Clerk publicMetadata, default to 'user' if not set
      const role = clerkUser.publicMetadata?.role as string || 'user'
      
      // Sync user data with Convex when Clerk user is loaded
      createOrUpdateUser({
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || undefined,
        avatar: clerkUser.imageUrl || undefined,
        role: role as 'admin' | 'user' | 'guest' | 'member',
      }).catch(error => {
        console.error('Failed to sync user with Convex:', error)
      })
    }
  }, [isLoaded, clerkUser, createOrUpdateUser])

  return {
    clerkUser,
    convexUser: currentUser,
    isLoaded,
    isSignedIn: !!clerkUser,
  }
}
