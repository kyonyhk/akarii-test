import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

// Helper function to generate secure invitation tokens
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate an invitation token for a conversation
export const generateInvitationToken = mutation({
  args: {
    conversationId: v.id('conversations'),
    expirationHours: v.optional(v.number()), // Default to 24 hours if not specified
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first()
    if (!user) {
      throw new Error('User not found')
    }

    // Verify the conversation exists and user has access
    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Check if user is a participant in the conversation
    if (!conversation.participants.includes(identity.subject)) {
      throw new Error('You do not have access to this conversation')
    }

    // Deactivate any existing active invitation tokens for this conversation
    const existingTokens = await ctx.db
      .query('invitationTokens')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    for (const token of existingTokens) {
      await ctx.db.patch(token._id, { isActive: false })
    }

    // Generate new secure token
    const token = generateSecureToken()
    const expirationHours = args.expirationHours || 24 // Default to 24 hours
    const expiresAt = Date.now() + expirationHours * 60 * 60 * 1000
    const createdAt = Date.now()

    // Create the invitation token
    const invitationId = await ctx.db.insert('invitationTokens', {
      conversationId: args.conversationId,
      token,
      createdBy: user._id,
      expiresAt,
      isActive: true,
      createdAt,
    })

    return {
      invitationId,
      token,
      expiresAt,
      conversationId: args.conversationId,
      shareUrl: `/chat/join/${token}`,
    }
  },
})

// Validate an invitation token (query for checking before joining)
export const validateInvitationToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query('invitationTokens')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first()

    if (!invitation) {
      return { valid: false, reason: 'Invalid invitation token' }
    }

    if (!invitation.isActive) {
      return { valid: false, reason: 'Invitation token has been deactivated' }
    }

    if (invitation.expiresAt < Date.now()) {
      return { valid: false, reason: 'Invitation token has expired' }
    }

    // Check if the conversation still exists
    const conversation = await ctx.db.get(invitation.conversationId)
    if (!conversation || !conversation.isActive) {
      return {
        valid: false,
        reason: 'Conversation no longer exists or is inactive',
      }
    }

    // Get creator information
    const createdBy = await ctx.db.get(invitation.createdBy)

    return {
      valid: true,
      invitation: {
        ...invitation,
        conversation: {
          id: conversation._id,
          title: conversation.title,
          participantCount: conversation.participants.length,
        },
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

// Join a conversation using an invitation token
export const joinConversationWithToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first()
    if (!user) {
      throw new Error('User not found')
    }

    // Find and validate the invitation token
    const invitation = await ctx.db
      .query('invitationTokens')
      .withIndex('by_token', q => q.eq('token', args.token))
      .first()

    if (!invitation) {
      throw new Error('Invalid invitation token')
    }

    if (!invitation.isActive) {
      throw new Error('Invitation token has been deactivated')
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error('Invitation token has expired')
    }

    // Check if the conversation exists and is active
    const conversation = await ctx.db.get(invitation.conversationId)
    if (!conversation || !conversation.isActive) {
      throw new Error('Conversation no longer exists or is inactive')
    }

    // Check if user is already a participant
    if (conversation.participants.includes(identity.subject)) {
      // User is already a participant, just return the conversation ID
      return {
        conversationId: invitation.conversationId,
        alreadyMember: true,
        message: 'You are already a participant in this conversation',
      }
    }

    // Add user to conversation participants
    const updatedParticipants = [...conversation.participants, identity.subject]
    await ctx.db.patch(invitation.conversationId, {
      participants: updatedParticipants,
      updatedAt: Date.now(),
    })

    // Mark the invitation token as used (but keep it active for potential future use)
    await ctx.db.patch(invitation._id, {
      usedBy: user._id,
      usedAt: Date.now(),
    })

    return {
      conversationId: invitation.conversationId,
      alreadyMember: false,
      message: 'Successfully joined the conversation',
      conversationTitle: conversation.title,
    }
  },
})

// Get invitation tokens for a conversation (for conversation owners)
export const getConversationInvitations = query({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      // Return empty array instead of throwing error for better UX
      return []
    }

    // Verify the conversation exists and user has access
    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Check if user is a participant in the conversation
    if (!conversation.participants.includes(identity.subject)) {
      throw new Error('You do not have access to this conversation')
    }

    // Get all invitation tokens for this conversation
    const invitations = await ctx.db
      .query('invitationTokens')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .collect()

    // Enhance with creator information and expiration status
    const invitationsWithDetails = await Promise.all(
      invitations.map(async invitation => {
        const createdBy = await ctx.db.get(invitation.createdBy)
        return {
          ...invitation,
          isExpired: invitation.expiresAt < Date.now(),
          createdBy: createdBy
            ? {
                name: createdBy.name,
                email: createdBy.email,
              }
            : null,
          usedByUser: invitation.usedBy
            ? await ctx.db
                .get(invitation.usedBy)
                .then(user =>
                  user ? { name: user.name, email: user.email } : null
                )
            : null,
        }
      })
    )

    return invitationsWithDetails
  },
})

// Deactivate an invitation token
export const deactivateInvitationToken = mutation({
  args: {
    tokenId: v.id('invitationTokens'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the invitation token
    const invitation = await ctx.db.get(args.tokenId)
    if (!invitation) {
      throw new Error('Invitation token not found')
    }

    // Verify the conversation exists and user has access
    const conversation = await ctx.db.get(invitation.conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Check if user is a participant in the conversation
    if (!conversation.participants.includes(identity.subject)) {
      throw new Error('You do not have access to this conversation')
    }

    // Deactivate the token
    await ctx.db.patch(args.tokenId, {
      isActive: false,
    })

    return { success: true, tokenId: args.tokenId }
  },
})

// Clean up expired invitation tokens (can be called periodically)
export const cleanupExpiredInvitationTokens = mutation({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const expiredTokens = await ctx.db
      .query('invitationTokens')
      .withIndex('by_expires', q => q.lt('expiresAt', now))
      .filter(q => q.eq(q.field('isActive'), true))
      .collect()

    let cleanedCount = 0
    for (const token of expiredTokens) {
      await ctx.db.patch(token._id, { isActive: false })
      cleanedCount++
    }

    return { cleanedCount, cleanedAt: now }
  },
})
