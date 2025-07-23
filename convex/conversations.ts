import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentTimestamp, generateConversationTitle } from './utils'

// Create a new conversation
export const createConversation = mutation({
  args: {
    title: v.optional(v.string()),
    participants: v.array(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate participants
    if (args.participants.length === 0) {
      throw new Error('Conversation must have at least one participant')
    }

    // Ensure creator is in participants
    const participants = args.participants.includes(args.createdBy)
      ? args.participants
      : [...args.participants, args.createdBy]

    const timestamp = getCurrentTimestamp()

    // Create the conversation
    const conversationId = await ctx.db.insert('conversations', {
      title: args.title || 'New Conversation',
      participants,
      createdAt: timestamp,
      updatedAt: timestamp,
      isActive: true,
    })

    return conversationId
  },
})

// Get conversations for a user
export const getConversations = query({
  args: {
    userId: v.string(),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const includeInactive = args.includeInactive ?? false

    // Get all conversations and filter client-side for now
    // In production, you'd want to create a separate table for user-conversation relationships
    const allConversations = await ctx.db
      .query('conversations')
      .order('desc')
      .collect()

    // Filter conversations where user is a participant
    const userConversations = allConversations.filter(conversation => {
      const hasAccess = conversation.participants.includes(args.userId)
      const isActiveCheck = includeInactive || conversation.isActive
      return hasAccess && isActiveCheck
    })

    return userConversations
  },
})

// Get a single conversation by ID
export const getConversation = query({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user has access to this conversation
    if (!conversation.participants.includes(args.userId)) {
      throw new Error('You do not have access to this conversation')
    }

    return conversation
  },
})

// Update conversation title
export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id('conversations'),
    title: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user has access to this conversation
    if (!conversation.participants.includes(args.userId)) {
      throw new Error('You do not have access to this conversation')
    }

    // Validate title
    if (!args.title.trim()) {
      throw new Error('Title cannot be empty')
    }

    if (args.title.length > 200) {
      throw new Error('Title too long (max 200 characters)')
    }

    // Update the conversation
    await ctx.db.patch(args.conversationId, {
      title: args.title.trim(),
      updatedAt: getCurrentTimestamp(),
    })

    return args.conversationId
  },
})

// Add participant to conversation
export const addParticipant = mutation({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
    newParticipantId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user has access to this conversation
    if (!conversation.participants.includes(args.userId)) {
      throw new Error('You do not have access to this conversation')
    }

    // Check if participant is already in the conversation
    if (conversation.participants.includes(args.newParticipantId)) {
      throw new Error('User is already a participant in this conversation')
    }

    // Add the new participant
    const updatedParticipants = [
      ...conversation.participants,
      args.newParticipantId,
    ]

    await ctx.db.patch(args.conversationId, {
      participants: updatedParticipants,
      updatedAt: getCurrentTimestamp(),
    })

    return args.conversationId
  },
})

// Remove participant from conversation
export const removeParticipant = mutation({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
    participantToRemove: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user has access to this conversation
    if (!conversation.participants.includes(args.userId)) {
      throw new Error('You do not have access to this conversation')
    }

    // Check if trying to remove a participant that doesn't exist
    if (!conversation.participants.includes(args.participantToRemove)) {
      throw new Error('User is not a participant in this conversation')
    }

    // Prevent removing the last participant
    if (conversation.participants.length <= 1) {
      throw new Error('Cannot remove the last participant from a conversation')
    }

    // Remove the participant
    const updatedParticipants = conversation.participants.filter(
      id => id !== args.participantToRemove
    )

    await ctx.db.patch(args.conversationId, {
      participants: updatedParticipants,
      updatedAt: getCurrentTimestamp(),
    })

    return args.conversationId
  },
})

// Archive/deactivate a conversation
export const archiveConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user has access to this conversation
    if (!conversation.participants.includes(args.userId)) {
      throw new Error('You do not have access to this conversation')
    }

    // Archive the conversation
    await ctx.db.patch(args.conversationId, {
      isActive: false,
      updatedAt: getCurrentTimestamp(),
    })

    return args.conversationId
  },
})

// Reactivate a conversation
export const reactivateConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user has access to this conversation
    if (!conversation.participants.includes(args.userId)) {
      throw new Error('You do not have access to this conversation')
    }

    // Reactivate the conversation
    await ctx.db.patch(args.conversationId, {
      isActive: true,
      updatedAt: getCurrentTimestamp(),
    })

    return args.conversationId
  },
})

// Auto-generate conversation title from first message
export const generateTitleFromMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    messageContent: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user has access to this conversation
    if (!conversation.participants.includes(args.userId)) {
      throw new Error('You do not have access to this conversation')
    }

    // Generate title from message content
    const title = generateConversationTitle(args.messageContent)

    // Update the conversation
    await ctx.db.patch(args.conversationId, {
      title,
      updatedAt: getCurrentTimestamp(),
    })

    return title
  },
})
