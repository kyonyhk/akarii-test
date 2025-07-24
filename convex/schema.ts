import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  messages: defineTable({
    content: v.string(),
    userId: v.string(), // Keep as string for compatibility with existing functions
    conversationId: v.string(), // Keep as string for compatibility with existing functions
    timestamp: v.number(),
    analysisId: v.optional(v.id('analyses')),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_user', ['userId'])
    .index('by_timestamp', ['timestamp']),

  analyses: defineTable({
    messageId: v.id('messages'),
    statementType: v.union(
      v.literal('question'),
      v.literal('opinion'),
      v.literal('fact'),
      v.literal('request'),
      v.literal('other')
    ),
    beliefs: v.array(v.string()),
    tradeOffs: v.array(v.string()),
    confidenceLevel: v.number(),
    rawData: v.any(),
    thumbsUp: v.number(),
    thumbsDown: v.number(),
    userVotes: v.object({}), // Will store userId -> 'up' | 'down'
    createdAt: v.number(),
  })
    .index('by_message', ['messageId'])
    .index('by_created_at', ['createdAt']),

  conversations: defineTable({
    title: v.string(),
    participants: v.array(v.string()), // Keep as string for compatibility with existing functions
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.boolean(),
  })
    .index('by_created_at', ['createdAt'])
    .index('by_active', ['isActive']),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.union(v.literal('member'), v.literal('admin')),
    joinedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  teams: defineTable({
    name: v.string(),
    members: v.array(v.id('users')), // User IDs
    createdAt: v.number(),
  }).index('by_created_at', ['createdAt']),

  inviteLinks: defineTable({
    teamId: v.id('teams'),
    token: v.string(),
    expiresAt: v.number(),
    createdBy: v.id('users'),
    isActive: v.boolean(),
  })
    .index('by_team', ['teamId'])
    .index('by_token', ['token'])
    .index('by_active', ['isActive']),

  usageMetrics: defineTable({
    messageId: v.optional(v.id('messages')),
    teamId: v.optional(v.id('teams')),
    userId: v.string(), // Keep as string for compatibility with existing functions
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    cost: v.number(),
    operationType: v.union(
      v.literal('analysis'),
      v.literal('bulk_analysis'),
      v.literal('test')
    ),
    timestamp: v.number(),
  })
    .index('by_message', ['messageId'])
    .index('by_team', ['teamId'])
    .index('by_user', ['userId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_operation', ['operationType']),

  usage: defineTable({
    messageId: v.id('messages'),
    teamId: v.id('teams'),
    tokensUsed: v.number(),
    cost: v.number(),
    timestamp: v.number(),
    model: v.string(),
    actionType: v.union(
      v.literal('analysis'),
      v.literal('bulk_analysis'),
      v.literal('test')
    ),
  })
    .index('by_team_timestamp', ['teamId', 'timestamp'])
    .index('by_message', ['messageId'])
    .index('by_timestamp', ['timestamp']),
})
