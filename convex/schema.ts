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
    userVotes: v.array(
      v.object({
        userId: v.string(),
        voteType: v.union(v.literal('up'), v.literal('down')),
        timestamp: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index('by_message', ['messageId'])
    .index('by_created_at', ['createdAt'])
    .index('by_thumbs_up', ['thumbsUp'])
    .index('by_thumbs_down', ['thumbsDown']),

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

  alertConfigurations: defineTable({
    teamId: v.id('teams'),
    alertType: v.union(
      v.literal('token_limit'),
      v.literal('cost_limit'),
      v.literal('daily_usage'),
      v.literal('monthly_usage')
    ),
    thresholdValue: v.number(), // Token count or cost amount
    thresholdUnit: v.union(
      v.literal('tokens'),
      v.literal('dollars'),
      v.literal('percentage')
    ),
    timeWindow: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('monthly'),
      v.literal('total')
    ),
    isActive: v.boolean(),
    notificationMethods: v.array(
      v.union(v.literal('email'), v.literal('dashboard'), v.literal('webhook'))
    ),
    warningThreshold: v.optional(v.number()), // For soft warnings at % of limit
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_alert_type', ['alertType'])
    .index('by_active', ['isActive']),

  alertHistory: defineTable({
    alertConfigId: v.id('alertConfigurations'),
    teamId: v.id('teams'),
    alertType: v.string(),
    thresholdValue: v.number(),
    actualValue: v.number(),
    isWarning: v.boolean(), // true for soft warnings, false for hard limits
    notificationsSent: v.array(v.string()), // Methods used to send alert
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_alert_config', ['alertConfigId'])
    .index('by_team', ['teamId'])
    .index('by_created_at', ['createdAt'])
    .index('by_resolved', ['resolvedAt']),

  notificationPreferences: defineTable({
    userId: v.id('users'),
    teamId: v.optional(v.id('teams')),
    emailEnabled: v.boolean(),
    dashboardEnabled: v.boolean(),
    webhookUrl: v.optional(v.string()),
    alertTypes: v.array(v.string()), // Which alert types user wants to receive
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_team', ['teamId'])
    .index('by_user_team', ['userId', 'teamId']),

  usageLimits: defineTable({
    teamId: v.id('teams'),
    limitType: v.union(
      v.literal('hard_token_limit'),
      v.literal('hard_cost_limit'),
      v.literal('rate_limit')
    ),
    limitValue: v.number(),
    timeWindow: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('monthly'),
      v.literal('total')
    ),
    isActive: v.boolean(),
    enforcementAction: v.union(
      v.literal('block_requests'),
      v.literal('require_approval'),
      v.literal('notify_only')
    ),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_limit_type', ['limitType'])
    .index('by_active', ['isActive']),

  conversationLinks: defineTable({
    conversationId: v.string(), // Keep as string for compatibility with existing conversation IDs
    token: v.string(), // Unique token for the shareable link
    accessType: v.union(
      v.literal('public'), // Anyone with the link can view
      v.literal('private') // Only specific users can view (for future use)
    ),
    permissions: v.union(
      v.literal('view'), // Read-only access to conversation
      v.literal('comment') // Can view and add messages (for future use)
    ),
    expiresAt: v.optional(v.number()), // Optional expiration timestamp
    createdBy: v.string(), // User ID who created the link (keep as string for compatibility)
    isActive: v.boolean(), // Whether the link is currently active
    viewCount: v.number(), // Track how many times the link has been accessed
    lastAccessedAt: v.optional(v.number()), // When the link was last used
    title: v.optional(v.string()), // Optional custom title for shared link
    description: v.optional(v.string()), // Optional description for the shared content
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_token', ['token'])
    .index('by_creator', ['createdBy'])
    .index('by_active', ['isActive'])
    .index('by_expires_at', ['expiresAt'])
    .index('by_created_at', ['createdAt']),
})
