import { mutation, query } from './_generated/server'
import { ensureAdmin, getUserRole, isAdmin } from './rbac'

/**
 * Test mutation protected by admin role requirement
 * This can be used to test the ensureAdmin function
 */
export const testAdminOnly = mutation({
  args: {},
  handler: async ctx => {
    // This will throw an error if user is not admin
    await ensureAdmin(ctx)

    return {
      message: 'Success! You have admin access.',
      timestamp: Date.now(),
    }
  },
})

/**
 * Test query to check current user's role
 */
export const checkMyRole = query({
  args: {},
  handler: async ctx => {
    const role = await getUserRole(ctx)
    const adminStatus = await isAdmin(ctx)

    return {
      role,
      isAdmin: adminStatus,
      timestamp: Date.now(),
    }
  },
})

/**
 * Test mutation to verify role-based access works
 */
export const testRoleAccess = mutation({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const role = await getUserRole(ctx)
    const adminStatus = await isAdmin(ctx)

    return {
      userId: identity.subject,
      email: identity.email,
      role,
      isAdmin: adminStatus,
      publicMetadata: identity.publicMetadata,
      message: `Access granted for role: ${role}`,
    }
  },
})
