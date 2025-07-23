import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentTimestamp } from './utils'

// Send a new message
export const sendMessage = mutation({
  args: {
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate message content
    if (!args.content.trim()) {
      throw new Error('Message content cannot be empty')
    }

    if (args.content.length > 10000) {
      throw new Error('Message content too long (max 10,000 characters)')
    }

    // Insert the message
    const messageId = await ctx.db.insert('messages', {
      content: args.content.trim(),
      userId: args.userId,
      conversationId: args.conversationId,
      timestamp: getCurrentTimestamp(),
    })

    // Update conversation's updatedAt timestamp
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), args.conversationId))
      .first()

    if (conversation) {
      await ctx.db.patch(conversation._id, {
        updatedAt: getCurrentTimestamp(),
      })
    }

    return messageId
  },
})

// Get messages for a conversation with pagination
export const getMessages = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    // For now, get all messages and filter client-side
    // In production with proper Convex setup, you'd use the index properly
    const allMessages = await ctx.db.query('messages').order('desc').collect()

    // Filter by conversation
    const conversationMessages = allMessages.filter(
      message => message.conversationId === args.conversationId
    )

    // Apply cursor pagination if provided
    let filteredMessages = conversationMessages
    if (args.cursor) {
      const cursorIndex = conversationMessages.findIndex(
        message => message._id === args.cursor
      )
      if (cursorIndex !== -1) {
        filteredMessages = conversationMessages.slice(cursorIndex + 1)
      }
    }

    // Limit results
    const paginatedMessages = filteredMessages.slice(0, limit)

    // Return in chronological order (oldest first)
    return paginatedMessages.reverse()
  },
})

// Get recent messages across all conversations for a user
export const getRecentMessages = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20

    const allMessages = await ctx.db.query('messages').order('desc').collect()

    const userMessages = allMessages
      .filter(message => message.userId === args.userId)
      .slice(0, limit)

    return userMessages
  },
})

// Get a single message by ID
export const getMessage = query({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)

    if (!message) {
      throw new Error('Message not found')
    }

    return message
  },
})

// Update a message (for editing)
export const updateMessage = mutation({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the existing message
    const message = await ctx.db.get(args.messageId)

    if (!message) {
      throw new Error('Message not found')
    }

    // Verify the user owns this message
    if (message.userId !== args.userId) {
      throw new Error('You can only edit your own messages')
    }

    // Validate new content
    if (!args.content.trim()) {
      throw new Error('Message content cannot be empty')
    }

    if (args.content.length > 10000) {
      throw new Error('Message content too long (max 10,000 characters)')
    }

    // Update the message
    await ctx.db.patch(args.messageId, {
      content: args.content.trim(),
    })

    return args.messageId
  },
})

// Delete a message
export const deleteMessage = mutation({
  args: {
    messageId: v.id('messages'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the existing message
    const message = await ctx.db.get(args.messageId)

    if (!message) {
      throw new Error('Message not found')
    }

    // Verify the user owns this message
    if (message.userId !== args.userId) {
      throw new Error('You can only delete your own messages')
    }

    // Delete any associated analysis
    if (message.analysisId) {
      await ctx.db.delete(message.analysisId)
    }

    // Delete the message
    await ctx.db.delete(args.messageId)

    return args.messageId
  },
})

// Get message count for a conversation
export const getMessageCount = query({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db.query('messages').collect()

    const conversationMessages = allMessages.filter(
      message => message.conversationId === args.conversationId
    )

    return conversationMessages.length
  },
})

// Search messages by content
export const searchMessages = query({
  args: {
    conversationId: v.optional(v.string()),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const searchTerm = args.searchTerm.toLowerCase()

    const allMessages = await ctx.db.query('messages').order('desc').collect()

    // Filter messages by search term and conversation
    const filteredMessages = allMessages.filter(message => {
      const contentMatch = message.content.toLowerCase().includes(searchTerm)
      const conversationMatch = args.conversationId
        ? message.conversationId === args.conversationId
        : true

      return contentMatch && conversationMatch
    })

    return filteredMessages.slice(0, limit)
  },
})
