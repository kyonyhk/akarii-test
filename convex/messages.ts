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

// Get messages with user information for a conversation
export const getMessagesWithUsers = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    // Get all messages and filter by conversation
    const allMessages = await ctx.db.query('messages').order('desc').collect()
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

    // Get user information for each message
    const messagesWithUsers = await Promise.all(
      paginatedMessages.map(async message => {
        // Try to find user by clerkId first (assuming userId is clerkId)
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', message.userId))
          .first()

        // If not found, try to find by internal user ID
        let userInfo = null
        if (user) {
          userInfo = {
            name: user.name || user.email || 'Unknown User',
            email: user.email,
            avatar: user.avatar,
            role: user.role,
          }
        }

        return {
          ...message,
          user: userInfo,
        }
      })
    )

    // Return in chronological order (oldest first)
    return messagesWithUsers.reverse()
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

// Get messages from conversations that a user participates in
export const getMessagesFromUserConversations = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    // First, get all conversations the user participates in
    const allConversations = await ctx.db.query('conversations').collect()
    const userConversations = allConversations.filter(
      conversation =>
        conversation.participants.includes(args.userId) && conversation.isActive
    )
    const conversationIds = userConversations.map(c => c._id)

    // Then get messages from those conversations
    const allMessages = await ctx.db.query('messages').order('desc').collect()
    const conversationMessages = allMessages
      .filter(message => conversationIds.includes(message.conversationId))
      .slice(0, limit)

    // Get user information for each message
    const messagesWithUsers = await Promise.all(
      conversationMessages.map(async message => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', message.userId))
          .first()

        let userInfo = null
        if (user) {
          userInfo = {
            name: user.name || user.email || 'Unknown User',
            email: user.email,
            avatar: user.avatar,
            role: user.role,
          }
        }

        return {
          ...message,
          user: userInfo,
        }
      })
    )

    return messagesWithUsers
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

// Helper function to parse boolean search queries
function parseBooleanQuery(query: string): {
  andTerms: string[]
  orTerms: string[]
  notTerms: string[]
} {
  const andTerms: string[] = []
  const orTerms: string[] = []
  const notTerms: string[] = []

  // Split by OR first (case insensitive)
  const orParts = query.split(/\s+OR\s+/i)
  
  for (const orPart of orParts) {
    // Split by AND (case insensitive)
    const andParts = orPart.split(/\s+AND\s+/i)
    
    for (const andPart of andParts) {
      const trimmed = andPart.trim()
      
      // Check for NOT operator
      if (trimmed.toLowerCase().startsWith('not ')) {
        notTerms.push(trimmed.substring(4).trim().toLowerCase())
      } else if (orParts.length > 1) {
        // If we have OR operations, treat as OR terms
        orTerms.push(trimmed.toLowerCase())
      } else {
        // Default to AND terms
        andTerms.push(trimmed.toLowerCase())
      }
    }
  }

  // If no explicit operators, treat as simple AND search
  if (andTerms.length === 0 && orTerms.length === 0 && notTerms.length === 0) {
    return {
      andTerms: [query.toLowerCase()],
      orTerms: [],
      notTerms: []
    }
  }

  return { andTerms, orTerms, notTerms }
}

// Helper function to check if content matches boolean query
function matchesBooleanQuery(content: string, andTerms: string[], orTerms: string[], notTerms: string[]): boolean {
  const lowerContent = content.toLowerCase()

  // Check NOT terms first - if any match, exclude this content
  for (const notTerm of notTerms) {
    if (lowerContent.includes(notTerm)) {
      return false
    }
  }

  // Check AND terms - all must match
  for (const andTerm of andTerms) {
    if (!lowerContent.includes(andTerm)) {
      return false
    }
  }

  // Check OR terms - at least one must match (if any OR terms exist)
  if (orTerms.length > 0) {
    const hasOrMatch = orTerms.some(orTerm => lowerContent.includes(orTerm))
    if (!hasOrMatch) {
      return false
    }
  }

  return true
}

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

// Advanced search with boolean operators
export const searchMessagesWithBoolean = query({
  args: {
    conversationId: v.optional(v.string()),
    searchQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    
    // Parse boolean query
    const { andTerms, orTerms, notTerms } = parseBooleanQuery(args.searchQuery)

    const allMessages = await ctx.db.query('messages').order('desc').collect()

    // Filter messages by boolean query and conversation
    const filteredMessages = allMessages.filter(message => {
      const conversationMatch = args.conversationId
        ? message.conversationId === args.conversationId
        : true

      if (!conversationMatch) {
        return false
      }

      return matchesBooleanQuery(message.content, andTerms, orTerms, notTerms)
    })

    // Get user information for each message
    const messagesWithUsers = await Promise.all(
      filteredMessages.slice(0, limit).map(async message => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', message.userId))
          .first()

        let userInfo = null
        if (user) {
          userInfo = {
            name: user.name || user.email || 'Unknown User',
            email: user.email,
            avatar: user.avatar,
            role: user.role,
          }
        }

        return {
          ...message,
          user: userInfo,
        }
      })
    )

    return {
      results: messagesWithUsers,
      totalCount: filteredMessages.length,
      hasMore: filteredMessages.length > limit,
      query: {
        andTerms,
        orTerms,
        notTerms
      }
    }
  },
})
