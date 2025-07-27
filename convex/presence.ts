import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Update user presence in a room
export const updatePresence = mutation({
  args: {
    room: v.string(),
    user: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if user already has presence in this room
    const existing = await ctx.db
      .query('presence')
      .withIndex('by_room_user', q =>
        q.eq('room', args.room).eq('user', args.user)
      )
      .unique()

    if (existing) {
      // Update existing presence
      await ctx.db.patch(existing._id, {
        data: args.data,
        updated: now,
      })
      return existing._id
    } else {
      // Create new presence entry
      return await ctx.db.insert('presence', {
        room: args.room,
        user: args.user,
        data: args.data,
        updated: now,
      })
    }
  },
})

// Remove user presence from a room
export const removePresence = mutation({
  args: {
    room: v.string(),
    user: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('presence')
      .withIndex('by_room_user', q =>
        q.eq('room', args.room).eq('user', args.user)
      )
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})

// Get all users present in a room
export const getRoomPresence = query({
  args: {
    room: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const cutoff = now - 30000 // 30 seconds cutoff for "online"

    const presences = await ctx.db
      .query('presence')
      .withIndex('by_room', q => q.eq('room', args.room))
      .filter(q => q.gte(q.field('updated'), cutoff))
      .collect()

    return presences.map(presence => ({
      user: presence.user,
      data: presence.data,
      lastSeen: presence.updated,
    }))
  },
})

// Set typing status for a user in a conversation
export const setTypingStatus = mutation({
  args: {
    conversationId: v.string(),
    userId: v.string(),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if user already has presence in this room
    const existing = await ctx.db
      .query('presence')
      .withIndex('by_room_user', q =>
        q.eq('room', args.conversationId).eq('user', args.userId)
      )
      .unique()

    const presenceData = {
      isTyping: args.isTyping,
      lastTypingUpdate: now,
    }

    if (existing) {
      // Update existing presence with typing status
      await ctx.db.patch(existing._id, {
        data: {
          ...existing.data,
          ...presenceData,
        },
        updated: now,
      })
      return existing._id
    } else {
      // Create new presence entry with typing status
      return await ctx.db.insert('presence', {
        room: args.conversationId,
        user: args.userId,
        data: presenceData,
        updated: now,
      })
    }
  },
})

// Get typing status of users in a conversation
export const getTypingStatus = query({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const typingCutoff = now - 3000 // 3 seconds cutoff for typing indicators

    const presences = await ctx.db
      .query('presence')
      .withIndex('by_room', q => q.eq('room', args.conversationId))
      .filter(q => q.gte(q.field('updated'), typingCutoff))
      .collect()

    // Filter for users who are actively typing
    const typingUsers = presences
      .filter(
        presence =>
          presence.data?.isTyping === true &&
          presence.data?.lastTypingUpdate &&
          now - presence.data.lastTypingUpdate < typingCutoff
      )
      .map(presence => ({
        userId: presence.user,
        lastTypingUpdate: presence.data.lastTypingUpdate,
      }))

    return typingUsers
  },
})

// Clean up old presence entries (to be called periodically)
export const cleanupPresence = mutation({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const cutoff = now - 60000 // Remove entries older than 60 seconds

    const oldPresences = await ctx.db
      .query('presence')
      .withIndex('by_updated', q => q.lt('updated', cutoff))
      .collect()

    // Delete old presence entries
    await Promise.all(oldPresences.map(presence => ctx.db.delete(presence._id)))

    return { deleted: oldPresences.length }
  },
})
