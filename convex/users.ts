import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal('admin'),
        v.literal('user'),
        v.literal('guest'),
        v.literal('member')
      )
    ),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
      .first()

    if (existingUser) {
      // Update existing user
      const updateData: any = {
        email: args.email,
        name: args.name,
        avatar: args.avatar,
      }

      // Only update role if provided (preserve existing role otherwise)
      if (args.role) {
        updateData.role = args.role
      }

      await ctx.db.patch(existingUser._id, updateData)
      return existingUser._id
    } else {
      // Create new user with provided role or default to 'user'
      const userId = await ctx.db.insert('users', {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        avatar: args.avatar,
        role: args.role || 'user',
        joinedAt: Date.now(),
      })
      return userId
    }
  },
})

export const getCurrentUser = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.clerkId) {
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId!))
      .first()

    return user
  },
})

export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
      .first()
  },
})

export const updateUserPreference = mutation({
  args: {
    clerkId: v.string(),
    preferredModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    await ctx.db.patch(user._id, {
      preferredModel: args.preferredModel,
      updatedAt: Date.now(),
    })

    return user._id
  },
})
