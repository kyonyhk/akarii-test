import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const createConversationLink = mutation({
  args: {
    conversationId: v.string(),
    accessType: v.union(v.literal('public'), v.literal('private')),
    permissions: v.union(v.literal('view'), v.literal('comment')),
    expirationHours: v.optional(v.number()), // Optional expiration in hours
    title: v.optional(v.string()),
    description: v.optional(v.string()),
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

    // Verify user has access to the conversation
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), args.conversationId))
      .first()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    if (!conversation.participants.includes(user.clerkId)) {
      throw new Error('You do not have access to this conversation')
    }

    // Deactivate any existing active links for this conversation
    const existingLinks = await ctx.db
      .query('conversationLinks')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    for (const link of existingLinks) {
      await ctx.db.patch(link._id, { isActive: false })
    }

    // Create new shareable link
    const token = generateShareToken()
    const now = Date.now()
    const expiresAt = args.expirationHours
      ? now + args.expirationHours * 60 * 60 * 1000
      : undefined

    const linkId = await ctx.db.insert('conversationLinks', {
      conversationId: args.conversationId,
      token,
      accessType: args.accessType,
      permissions: args.permissions,
      expiresAt,
      createdBy: user.clerkId,
      isActive: true,
      viewCount: 0,
      title: args.title,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    })

    return {
      linkId,
      token,
      shareUrl: `/share/${token}`,
      expiresAt,
      accessType: args.accessType,
      permissions: args.permissions,
    }
  },
})

export const validateConversationLink = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query('conversationLinks')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first()

    if (!link) {
      return { valid: false, reason: 'Invalid share link' }
    }

    if (!link.isActive) {
      return { valid: false, reason: 'Share link has been deactivated' }
    }

    if (link.expiresAt && link.expiresAt < Date.now()) {
      return { valid: false, reason: 'Share link has expired' }
    }

    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), link.conversationId))
      .first()

    if (!conversation) {
      return { valid: false, reason: 'Conversation no longer exists' }
    }

    // Get creator info
    const creator = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', link.createdBy))
      .first()

    return {
      valid: true,
      link: {
        ...link,
        conversation: {
          id: conversation._id,
          title: conversation.title,
          createdAt: conversation.createdAt,
        },
        createdBy: creator
          ? {
              name: creator.name,
              email: creator.email,
            }
          : null,
      },
    }
  },
})

export const getConversationByShareLink = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // First validate the link
    const validation = await validateConversationLink(ctx, {
      token: args.token,
    })
    if (!validation.valid) {
      throw new Error(validation.reason)
    }

    const link = validation.link!

    // Update view count and last accessed time
    await ctx.db.patch(link._id, {
      viewCount: link.viewCount + 1,
      lastAccessedAt: Date.now(),
    })

    // Get the conversation with messages
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), link.conversationId))
      .first()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Get messages for this conversation
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', link.conversationId)
      )
      .order('asc')
      .collect()

    // Get user info for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async message => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', message.userId))
          .first()

        return {
          ...message,
          user: user
            ? {
                name: user.name || 'Anonymous',
                email: user.email,
                avatar: user.avatar,
              }
            : {
                name: 'Unknown User',
                email: '',
                avatar: undefined,
              },
        }
      })
    )

    return {
      conversation: {
        ...conversation,
        messages: messagesWithUsers,
      },
      shareInfo: {
        title: link.title || conversation.title,
        description: link.description,
        accessType: link.accessType,
        permissions: link.permissions,
        viewCount: link.viewCount + 1, // Include the current view
        createdBy: link.createdBy,
      },
    }
  },
})

export const getConversationLinks = query({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
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

    // Verify user has access to the conversation
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), args.conversationId))
      .first()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    if (!conversation.participants.includes(user.clerkId)) {
      throw new Error('You do not have access to this conversation')
    }

    const links = await ctx.db
      .query('conversationLinks')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .order('desc')
      .collect()

    const linksWithCreator = await Promise.all(
      links.map(async link => {
        const createdBy = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', link.createdBy))
          .first()

        return {
          ...link,
          createdBy: createdBy
            ? {
                name: createdBy.name,
                email: createdBy.email,
              }
            : null,
          isExpired: link.expiresAt ? link.expiresAt < Date.now() : false,
          shareUrl: `/share/${link.token}`,
        }
      })
    )

    return linksWithCreator
  },
})

export const updateConversationLink = mutation({
  args: {
    linkId: v.id('conversationLinks'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    accessType: v.optional(v.union(v.literal('public'), v.literal('private'))),
    permissions: v.optional(v.union(v.literal('view'), v.literal('comment'))),
    expirationHours: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
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

    const link = await ctx.db.get(args.linkId)
    if (!link) {
      throw new Error('Link not found')
    }

    // Verify user created this link or has access to the conversation
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), link.conversationId))
      .first()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    if (
      link.createdBy !== user.clerkId &&
      !conversation.participants.includes(user.clerkId)
    ) {
      throw new Error('You do not have permission to modify this link')
    }

    const updateData: any = {
      updatedAt: Date.now(),
    }

    if (args.title !== undefined) updateData.title = args.title
    if (args.description !== undefined)
      updateData.description = args.description
    if (args.accessType !== undefined) updateData.accessType = args.accessType
    if (args.permissions !== undefined)
      updateData.permissions = args.permissions
    if (args.isActive !== undefined) updateData.isActive = args.isActive
    if (args.expirationHours !== undefined) {
      updateData.expiresAt = args.expirationHours
        ? Date.now() + args.expirationHours * 60 * 60 * 1000
        : null
    }

    await ctx.db.patch(args.linkId, updateData)

    return args.linkId
  },
})

export const deactivateConversationLink = mutation({
  args: {
    linkId: v.id('conversationLinks'),
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

    const link = await ctx.db.get(args.linkId)
    if (!link) {
      throw new Error('Link not found')
    }

    // Verify user created this link or has access to the conversation
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), link.conversationId))
      .first()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    if (
      link.createdBy !== user.clerkId &&
      !conversation.participants.includes(user.clerkId)
    ) {
      throw new Error('You do not have permission to deactivate this link')
    }

    await ctx.db.patch(args.linkId, {
      isActive: false,
      updatedAt: Date.now(),
    })

    return args.linkId
  },
})

export const cleanupExpiredConversationLinks = mutation({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const expiredLinks = await ctx.db
      .query('conversationLinks')
      .filter(q =>
        q.and(
          q.neq(q.field('expiresAt'), undefined),
          q.lt(q.field('expiresAt'), now)
        )
      )
      .collect()

    let cleanedCount = 0
    for (const link of expiredLinks) {
      if (link.isActive) {
        await ctx.db.patch(link._id, {
          isActive: false,
          updatedAt: now,
        })
        cleanedCount++
      }
    }

    return { cleanedCount }
  },
})
