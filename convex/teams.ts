import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { ensureAdmin } from './rbac'

export const createTeam = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Ensure user has admin role
    await ensureAdmin(ctx)

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

    const teamId = await ctx.db.insert('teams', {
      name: args.name,
      members: [user._id],
      createdAt: Date.now(),
    })

    return teamId
  },
})

export const joinTeam = mutation({
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

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (team.members.includes(user._id)) {
      throw new Error('User is already a member of this team')
    }

    await ctx.db.patch(args.teamId, {
      members: [...team.members, user._id],
    })

    return args.teamId
  },
})

export const leaveTeam = mutation({
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

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (!team.members.includes(user._id)) {
      throw new Error('User is not a member of this team')
    }

    const updatedMembers = team.members.filter(
      memberId => memberId !== user._id
    )

    if (updatedMembers.length === 0) {
      await ctx.db.delete(args.teamId)
      return null
    }

    await ctx.db.patch(args.teamId, {
      members: updatedMembers,
    })

    return args.teamId
  },
})

export const getTeam = query({
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

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (!team.members.includes(user._id)) {
      throw new Error('User is not a member of this team')
    }

    const members = await Promise.all(
      team.members.map(memberId => ctx.db.get(memberId))
    )

    return {
      ...team,
      members: members.filter(member => member !== null),
    }
  },
})

export const getUserTeams = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      // Return empty array for unauthenticated users (demo mode)
      return []
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first()
    if (!user) {
      throw new Error('User not found')
    }

    const teams = await ctx.db.query('teams').collect()

    const userTeams = teams.filter(team => team.members.includes(user._id))

    const teamsWithMembers = await Promise.all(
      userTeams.map(async team => {
        const members = await Promise.all(
          team.members.map(memberId => ctx.db.get(memberId))
        )
        return {
          ...team,
          members: members.filter(member => member !== null),
        }
      })
    )

    return teamsWithMembers
  },
})

export const updateTeam = mutation({
  args: {
    teamId: v.id('teams'),
    name: v.string(),
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
      throw new Error('Only admins can update teams')
    }

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (!team.members.includes(user._id)) {
      throw new Error('User is not a member of this team')
    }

    await ctx.db.patch(args.teamId, {
      name: args.name,
    })

    return args.teamId
  },
})

export const removeTeamMember = mutation({
  args: {
    teamId: v.id('teams'),
    userId: v.id('users'),
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
      throw new Error('Only admins can remove team members')
    }

    const team = await ctx.db.get(args.teamId)
    if (!team) {
      throw new Error('Team not found')
    }

    if (!team.members.includes(user._id)) {
      throw new Error('User is not a member of this team')
    }

    if (!team.members.includes(args.userId)) {
      throw new Error('Target user is not a member of this team')
    }

    const updatedMembers = team.members.filter(
      memberId => memberId !== args.userId
    )

    if (updatedMembers.length === 0) {
      await ctx.db.delete(args.teamId)
      return null
    }

    await ctx.db.patch(args.teamId, {
      members: updatedMembers,
    })

    return args.teamId
  },
})

// Get all teams (for admin/system functions)
export const getAllTeams = query({
  args: {},
  handler: async ctx => {
    const teams = await ctx.db.query('teams').collect()
    return teams
  },
})
