import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

// Record usage data in the usage table
export const recordUsage = mutation({
  args: {
    messageId: v.id('messages'),
    teamId: v.id('teams'),
    tokensUsed: v.number(),
    cost: v.number(),
    model: v.string(),
    actionType: v.union(
      v.literal('analysis'),
      v.literal('bulk_analysis'),
      v.literal('test')
    ),
  },
  handler: async (ctx, args) => {
    const usageId = await ctx.db.insert('usage', {
      messageId: args.messageId,
      teamId: args.teamId,
      tokensUsed: args.tokensUsed,
      cost: args.cost,
      model: args.model,
      actionType: args.actionType,
      timestamp: Date.now(),
    })

    return usageId
  },
})

// Get usage data for a specific team with optional date range
export const getTeamUsage = query({
  args: {
    teamId: v.id('teams'),
    startTimestamp: v.optional(v.number()),
    endTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('usage')
      .withIndex('by_team_timestamp', q => q.eq('teamId', args.teamId))

    if (args.startTimestamp) {
      query = query.filter(q =>
        q.gte(q.field('timestamp'), args.startTimestamp!)
      )
    }

    if (args.endTimestamp) {
      query = query.filter(q => q.lte(q.field('timestamp'), args.endTimestamp!))
    }

    return await query.collect()
  },
})

// Get usage data for a specific message
export const getMessageUsage = query({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('usage')
      .withIndex('by_message', q => q.eq('messageId', args.messageId))
      .collect()
  },
})

// Get aggregated usage statistics for a team
export const getTeamUsageStats = query({
  args: {
    teamId: v.id('teams'),
    startTimestamp: v.optional(v.number()),
    endTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('usage')
      .withIndex('by_team_timestamp', q => q.eq('teamId', args.teamId))

    if (args.startTimestamp) {
      query = query.filter(q =>
        q.gte(q.field('timestamp'), args.startTimestamp!)
      )
    }

    if (args.endTimestamp) {
      query = query.filter(q => q.lte(q.field('timestamp'), args.endTimestamp!))
    }

    const usage = await query.collect()

    // Calculate aggregated statistics
    const stats = usage.reduce(
      (acc, record) => ({
        totalTokens: acc.totalTokens + record.tokensUsed,
        totalCost: acc.totalCost + record.cost,
        requestCount: acc.requestCount + 1,
      }),
      {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
      }
    )

    return {
      ...stats,
      averageCostPerRequest:
        stats.requestCount > 0 ? stats.totalCost / stats.requestCount : 0,
      averageTokensPerRequest:
        stats.requestCount > 0 ? stats.totalTokens / stats.requestCount : 0,
    }
  },
})

// Get usage data within a timestamp range for analytics
export const getUsageInRange = query({
  args: {
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    teamId: v.optional(v.id('teams')),
  },
  handler: async (ctx, args) => {
    let baseQuery = args.teamId
      ? ctx.db
          .query('usage')
          .withIndex('by_team_timestamp', q => q.eq('teamId', args.teamId!))
      : ctx.db.query('usage').withIndex('by_timestamp')

    return await baseQuery
      .filter(q =>
        q.and(
          q.gte(q.field('timestamp'), args.startTimestamp),
          q.lte(q.field('timestamp'), args.endTimestamp)
        )
      )
      .collect()
  },
})
