import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Check if a team is allowed to make a request based on usage limits
export const checkUsageLimits = query({
  args: { 
    teamId: v.id('teams'),
    estimatedTokens: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get active usage limits for the team
    const usageLimits = await ctx.db
      .query('usageLimits')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    if (usageLimits.length === 0) {
      return {
        allowed: true,
        message: 'No usage limits configured',
      }
    }

    // Get current usage for each time window
    const violations = []

    for (const limit of usageLimits) {
      const windowStart = getTimeWindowStart(limit.timeWindow)
      
      // Get current usage in this time window
      const usageRecords = await ctx.db
        .query('usageMetrics')
        .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
        .filter((q) => q.gte(q.field('timestamp'), windowStart))
        .collect()

      let currentValue = 0
      let estimatedNewValue = 0

      switch (limit.limitType) {
        case 'hard_token_limit':
          currentValue = usageRecords.reduce((sum, record) => sum + record.totalTokens, 0)
          estimatedNewValue = currentValue + (args.estimatedTokens || 0)
          break
        case 'hard_cost_limit':
          currentValue = usageRecords.reduce((sum, record) => sum + record.cost, 0)
          estimatedNewValue = currentValue + (args.estimatedCost || 0)
          break
        case 'rate_limit':
          currentValue = usageRecords.length
          estimatedNewValue = currentValue + 1
          break
      }

      // Check if adding this request would exceed the limit
      if (estimatedNewValue > limit.limitValue) {
        violations.push({
          limit,
          currentValue,
          estimatedNewValue,
          willExceed: true,
        })
      }
    }

    // Determine response based on enforcement actions
    const blockingViolations = violations.filter(v => v.limit.enforcementAction === 'block_requests')
    const approvalViolations = violations.filter(v => v.limit.enforcementAction === 'require_approval')

    if (blockingViolations.length > 0) {
      return {
        allowed: false,
        reason: 'usage_limit_exceeded',
        message: `Request blocked due to ${blockingViolations[0].limit.limitType} limit`,
        violations: blockingViolations,
        requiresAdmin: false,
      }
    }

    if (approvalViolations.length > 0) {
      return {
        allowed: false,
        reason: 'requires_approval',
        message: `Request requires admin approval due to ${approvalViolations[0].limit.limitType} limit`,
        violations: approvalViolations,
        requiresAdmin: true,
      }
    }

    return {
      allowed: true,
      message: 'Request within usage limits',
      violations: violations.filter(v => v.limit.enforcementAction === 'notify_only'),
    }
  },
})

// Helper function to get time window start (duplicated from alert_monitor.ts for convenience)
function getTimeWindowStart(window: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (window) {
    case 'daily':
      return today.getTime()
    case 'weekly':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return weekStart.getTime()
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    case 'total':
      return 0
    default:
      return today.getTime()
  }
}

// Record a blocked request attempt
export const recordBlockedRequest = mutation({
  args: {
    teamId: v.id('teams'),
    userId: v.string(),
    limitType: v.string(),
    estimatedTokens: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a usage record for the blocked attempt with special operation type
    const blockedRecordId = await ctx.db.insert('usageMetrics', {
      teamId: args.teamId,
      userId: args.userId,
      model: 'blocked_request',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: args.estimatedTokens || 0,
      cost: args.estimatedCost || 0,
      operationType: 'test', // Use 'test' as closest match for blocked requests
      timestamp: Date.now(),
    })

    return blockedRecordId
  },
})

// Create an approval request for usage that exceeds limits
export const createApprovalRequest = mutation({
  args: {
    teamId: v.id('teams'),
    userId: v.string(),
    requestType: v.string(),
    estimatedTokens: v.optional(v.number()),
    estimatedCost: v.optional(v.number()),
    justification: v.optional(v.string()),
    urgency: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  },
  handler: async (ctx, args) => {
    // For now, we'll create a placeholder approval system
    // In a full implementation, this would integrate with admin workflow
    
    // Log the approval request
    console.log('APPROVAL REQUEST CREATED:', {
      teamId: args.teamId,
      userId: args.userId,
      requestType: args.requestType,
      estimatedTokens: args.estimatedTokens,
      estimatedCost: args.estimatedCost,
      justification: args.justification,
      urgency: args.urgency,
      timestamp: new Date().toISOString(),
    })

    // In a real implementation, you would:
    // 1. Create an approval request record
    // 2. Notify team admins
    // 3. Provide approval/rejection interface
    // 4. Track approval status

    return {
      approvalRequestId: `approval_${Date.now()}`,
      status: 'pending',
      message: 'Approval request submitted to team administrators',
    }
  },
})

// Admin function to override usage limits temporarily
export const createUsageOverride = mutation({
  args: {
    teamId: v.id('teams'),
    adminUserId: v.id('users'),
    overrideType: v.union(
      v.literal('temporary_increase'),
      v.literal('temporary_disable'),
      v.literal('emergency_override')
    ),
    duration: v.number(), // Duration in milliseconds
    reason: v.string(),
    additionalTokens: v.optional(v.number()),
    additionalCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify the user is an admin
    const adminUser = await ctx.db.get(args.adminUserId)
    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Only administrators can create usage overrides')
    }

    // Create override record (this would be a new table in a full implementation)
    const overrideId = `override_${Date.now()}`
    
    console.log('USAGE OVERRIDE CREATED:', {
      overrideId,
      teamId: args.teamId,
      adminUserId: args.adminUserId,
      overrideType: args.overrideType,
      duration: args.duration,
      reason: args.reason,
      additionalTokens: args.additionalTokens,
      additionalCost: args.additionalCost,
      expiresAt: new Date(Date.now() + args.duration).toISOString(),
    })

    return {
      overrideId,
      expiresAt: Date.now() + args.duration,
      message: 'Usage override created successfully',
    }
  },
})

// Check if a team has any active overrides
export const getActiveOverrides = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    // In a full implementation, this would query an overrides table
    // For now, we'll return empty array
    return []
  },
})

// Get usage limit status with enforcement information
export const getUsageLimitStatus = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const usageLimits = await ctx.db
      .query('usageLimits')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const limitStatus = []

    for (const limit of usageLimits) {
      const windowStart = getTimeWindowStart(limit.timeWindow)
      
      const usageRecords = await ctx.db
        .query('usageMetrics')
        .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
        .filter((q) => q.gte(q.field('timestamp'), windowStart))
        .collect()

      let currentValue = 0
      let unit = ''

      switch (limit.limitType) {
        case 'hard_token_limit':
          currentValue = usageRecords.reduce((sum, record) => sum + record.totalTokens, 0)
          unit = 'tokens'
          break
        case 'hard_cost_limit':
          currentValue = usageRecords.reduce((sum, record) => sum + record.cost, 0)
          unit = 'dollars'
          break
        case 'rate_limit':
          currentValue = usageRecords.length
          unit = 'requests'
          break
      }

      const percentageUsed = (currentValue / limit.limitValue) * 100
      const isNearLimit = percentageUsed >= 80
      const isAtLimit = currentValue >= limit.limitValue

      limitStatus.push({
        limit,
        currentValue,
        percentageUsed,
        unit,
        isNearLimit,
        isAtLimit,
        remainingCapacity: Math.max(0, limit.limitValue - currentValue),
        enforcementAction: limit.enforcementAction,
        timeWindow: limit.timeWindow,
        windowStart,
      })
    }

    return {
      limits: limitStatus,
      hasActiveLimits: limitStatus.length > 0,
      hasBlockingLimits: limitStatus.some(l => l.isAtLimit && l.limit.enforcementAction === 'block_requests'),
      hasNearLimits: limitStatus.some(l => l.isNearLimit),
    }
  },
})

// Utility function to estimate token usage for different operation types
export const estimateTokenUsage = query({
  args: {
    operationType: v.union(
      v.literal('analysis'),
      v.literal('bulk_analysis'),
      v.literal('test')
    ),
    messageCount: v.optional(v.number()),
    messageLength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Basic estimation logic - in a real implementation, this would be more sophisticated
    let estimatedTokens = 0
    let estimatedCost = 0

    const baseTokensPerMessage = 100 // Base tokens for processing
    const tokensPerCharacter = 0.25 // Rough estimate
    const costPerToken = 0.00002 // Rough estimate for GPT-4o

    switch (args.operationType) {
      case 'analysis':
        estimatedTokens = baseTokensPerMessage + (args.messageLength || 0) * tokensPerCharacter + 500 // Analysis overhead
        break
      case 'bulk_analysis':
        estimatedTokens = (args.messageCount || 1) * (baseTokensPerMessage + 300) // Bulk processing
        break
      case 'test':
        estimatedTokens = 50 // Minimal for tests
        break
    }

    estimatedCost = estimatedTokens * costPerToken

    return {
      estimatedTokens: Math.ceil(estimatedTokens),
      estimatedCost: Number(estimatedCost.toFixed(4)),
      operationType: args.operationType,
    }
  },
})