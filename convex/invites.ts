import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const createInviteLink = mutation({
  args: {
    teamId: v.id('teams'),
    expirationHours: v.optional(v.number()), // Default to 7 days if not specified
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first()
    if (!user) {
      throw new Error('User not found')
    }

    if (user.role !== 'admin') {
      throw new Error('Only admins can create invite links')
    }

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (!team.members.includes(user._id)) {
      throw new Error('User is not a member of this team')
    }

    // Deactivate any existing active invites for this team
    const existingInvites = await ctx.db
      .query('inviteLinks')
      .withIndex('by_team', q => q.eq('teamId', args.teamId))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    for (const invite of existingInvites) {
      await ctx.db.patch(invite._id, { isActive: false })
    }

    // Create new invite
    const token = generateInviteToken()
    const expirationHours = args.expirationHours || 24 * 7 // Default to 7 days
    const expiresAt = Date.now() + expirationHours * 60 * 60 * 1000

    const inviteId = await ctx.db.insert('inviteLinks', {
      teamId: args.teamId,
      token,
      expiresAt,
      createdBy: user._id,
      isActive: true,
    })

    return {
      inviteId,
      token,
      expiresAt,
      inviteUrl: `/invite/${token}`,
    }
  },
})

export const validateInviteToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query('inviteLinks')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first()

    if (!invite) {
      return { valid: false, reason: 'Invalid invite token' }
    }

    if (!invite.isActive) {
      return { valid: false, reason: 'Invite link has been deactivated' }
    }

    if (invite.expiresAt < Date.now()) {
      return { valid: false, reason: 'Invite link has expired' }
    }

    const team = await ctx.db.get(invite.teamId)
    if (!team) {
      return { valid: false, reason: 'Team no longer exists' }
    }

    const createdBy = await ctx.db.get(invite.createdBy)

    return {
      valid: true,
      invite: {
        ...invite,
        team,
        createdBy: createdBy
          ? {
              name: createdBy.name,
              email: createdBy.email,
            }
          : null,
      },
    }
  },
})

export const acceptInvite = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first()
    if (!user) {
      throw new Error('User not found')
    }

    // Validate invite
    const invite = await ctx.db
      .query('inviteLinks')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first()

    if (!invite) {
      throw new Error('Invalid invite token')
    }

    if (!invite.isActive) {
      throw new Error('Invite link has been deactivated')
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error('Invite link has expired')
    }

    const team = await ctx.db.get(invite.teamId)
    if (!team) {
      throw new Error('Team no longer exists')
    }

    // Check if user is already a member
    if (team.members.includes(user._id)) {
      throw new Error('User is already a member of this team')
    }

    // Add user to team
    await ctx.db.patch(invite.teamId, {
      members: [...team.members, user._id],
    })

    return {
      teamId: invite.teamId,
      teamName: team.name,
    }
  },
})

export const getTeamInvites = query({
  args: {
    teamId: v.id('teams'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first()
    if (!user) {
      throw new Error('User not found')
    }

    if (user.role !== 'admin') {
      throw new Error('Only admins can view team invites')
    }

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (!team.members.includes(user._id)) {
      throw new Error('User is not a member of this team')
    }

    const invites = await ctx.db
      .query('inviteLinks')
      .withIndex('by_team', q => q.eq('teamId', args.teamId))
      .collect()

    const invitesWithCreator = await Promise.all(
      invites.map(async invite => {
        const createdBy = await ctx.db.get(invite.createdBy)
        return {
          ...invite,
          createdBy: createdBy
            ? {
                name: createdBy.name,
                email: createdBy.email,
              }
            : null,
          isExpired: invite.expiresAt < Date.now(),
        }
      })
    )

    return invitesWithCreator
  },
})

export const deactivateInvite = mutation({
  args: {
    inviteId: v.id('inviteLinks'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first()
    if (!user) {
      throw new Error('User not found')
    }

    if (user.role !== 'admin') {
      throw new Error('Only admins can deactivate invites')
    }

    const invite = await ctx.db.get(args.inviteId)
    if (!invite) {
      throw new Error('Invite not found')
    }

    const team = await ctx.db.get(invite.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (!team.members.includes(user._id)) {
      throw new Error('User is not a member of this team')
    }

    await ctx.db.patch(args.inviteId, {
      isActive: false,
    })

    return args.inviteId
  },
})

export const cleanupExpiredInvites = mutation({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const expiredInvites = await ctx.db
      .query('inviteLinks')
      .filter(q => q.lt(q.field('expiresAt'), now))
      .collect()

    let cleanedCount = 0
    for (const invite of expiredInvites) {
      if (invite.isActive) {
        await ctx.db.patch(invite._id, { isActive: false })
        cleanedCount++
      }
    }

    return { cleanedCount }
  },
})
