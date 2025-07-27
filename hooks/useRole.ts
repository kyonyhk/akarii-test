import { useUser } from '@clerk/nextjs'

export type UserRole = 'admin' | 'user' | 'guest' | 'member' | null

export function useRole(): {
  role: UserRole
  isLoading: boolean
  isAdmin: boolean
  isUser: boolean
} {
  const { user, isLoaded } = useUser()

  // Extract role from Clerk user's publicMetadata
  const role = (user?.publicMetadata?.role as UserRole) || null

  return {
    role,
    isLoading: !isLoaded,
    isAdmin: role === 'admin',
    isUser: role === 'user',
  }
}
