import { QueryCtx, MutationCtx } from './_generated/server'

/**
 * Role-Based Access Control (RBAC) utilities for Convex backend
 */

export type UserRole = 'admin' | 'user' | 'guest' | 'member'

/**
 * Get the current user's role from Clerk's publicMetadata
 */
export async function getUserRole(
  ctx: QueryCtx | MutationCtx
): Promise<UserRole | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  // Extract role from Clerk's publicMetadata
  const role = (identity.publicMetadata as any)?.role as UserRole
  return role || 'user' // Default to 'user' if no role is set
}

/**
 * Check if the current user has admin role
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const role = await getUserRole(ctx)
  return role === 'admin'
}

/**
 * Ensure the current user is authenticated and has admin role
 * Throws an error if not authenticated or not admin
 */
export async function ensureAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Authentication required')
  }

  const role = await getUserRole(ctx)
  if (role !== 'admin') {
    throw new Error('Admin access required')
  }
}

/**
 * Ensure the current user is authenticated and has at least the specified role
 * Role hierarchy: admin > member > user > guest
 */
export async function ensureRole(
  ctx: QueryCtx | MutationCtx,
  requiredRole: UserRole
): Promise<void> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Authentication required')
  }

  const userRole = await getUserRole(ctx)
  if (!userRole) {
    throw new Error('User role not found')
  }

  const roleHierarchy: Record<UserRole, number> = {
    guest: 0,
    user: 1,
    member: 2,
    admin: 3,
  }

  const userLevel = roleHierarchy[userRole]
  const requiredLevel = roleHierarchy[requiredRole]

  if (userLevel < requiredLevel) {
    throw new Error(
      `Access denied. Required role: ${requiredRole}, current role: ${userRole}`
    )
  }
}

/**
 * Get the current user's identity information including role
 */
export async function getCurrentUserWithRole(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  const role = await getUserRole(ctx)

  return {
    ...identity,
    role,
  }
}
