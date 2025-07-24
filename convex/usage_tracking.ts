import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

// Record token usage in the database
export const recordUsage = mutation({
  args: {
    messageId: v.optional(v.id('messages')),
    teamId: v.optional(v.id('teams')),
    userId: v.string(),
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
  },
  handler: async (ctx, args) => {
    const usageId = await ctx.db.insert('usageMetrics', {
      messageId: args.messageId,
      teamId: args.teamId,
      userId: args.userId,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      cost: args.cost,
      operationType: args.operationType,
      timestamp: Date.now(),
    })

    return usageId
  },
})

// Get usage metrics for a specific user
export const getUserUsage = query({
  args: {
    userId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('usageMetrics')
      .withIndex('by_user', q => q.eq('userId', args.userId))

    if (args.startDate) {
      query = query.filter(q => q.gte(q.field('timestamp'), args.startDate!))
    }

    if (args.endDate) {
      query = query.filter(q => q.lte(q.field('timestamp'), args.endDate!))
    }

    return await query.collect()
  },
})

// Get usage metrics for a specific team
export const getTeamUsage = query({
  args: {
    teamId: v.id('teams'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('usageMetrics')
      .withIndex('by_team', q => q.eq('teamId', args.teamId))

    if (args.startDate) {
      query = query.filter(q => q.gte(q.field('timestamp'), args.startDate!))
    }

    if (args.endDate) {
      query = query.filter(q => q.lte(q.field('timestamp'), args.endDate!))
    }

    return await query.collect()
  },
})

// Get aggregated usage statistics
export const getUsageStats = query({
  args: {
    userId: v.optional(v.string()),
    teamId: v.optional(v.id('teams')),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let baseQuery

    if (args.userId) {
      baseQuery = ctx.db
        .query('usageMetrics')
        .withIndex('by_user', q => q.eq('userId', args.userId!))
    } else if (args.teamId) {
      baseQuery = ctx.db
        .query('usageMetrics')
        .withIndex('by_team', q => q.eq('teamId', args.teamId!))
    } else {
      baseQuery = ctx.db.query('usageMetrics')
    }

    let query = baseQuery

    if (args.startDate) {
      query = query.filter(q => q.gte(q.field('timestamp'), args.startDate!))
    }

    if (args.endDate) {
      query = query.filter(q => q.lte(q.field('timestamp'), args.endDate!))
    }

    const usage = await query.collect()

    // Calculate aggregated statistics
    const stats = usage.reduce(
      (acc, record) => ({
        totalTokens: acc.totalTokens + record.totalTokens,
        totalCost: acc.totalCost + record.cost,
        requestCount: acc.requestCount + 1,
        inputTokens: acc.inputTokens + record.inputTokens,
        outputTokens: acc.outputTokens + record.outputTokens,
      }),
      {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    )

    return {
      ...stats,
      averageCostPerRequest:
        stats.requestCount > 0 ? stats.totalCost / stats.requestCount : 0,
      averageTokensPerRequest:
        stats.requestCount > 0 ? stats.totalTokens / stats.requestCount : 0,
      usage, // Include detailed records
    }
  },
})
