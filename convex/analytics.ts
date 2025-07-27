import { query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Cost aggregation query for analytics dashboard
 * Groups usage data by time intervals and AI model
 */
export const getCostAggregation = query({
  args: {
    startTimestamp: v.optional(v.number()),
    endTimestamp: v.optional(v.number()),
    interval: v.union(v.literal('day'), v.literal('week'), v.literal('month')),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get usage data within the specified time range
    let usageQuery = ctx.db.query('usage')

    if (args.startTimestamp && args.endTimestamp) {
      usageQuery = usageQuery.filter(q =>
        q.and(
          q.gte(q.field('timestamp'), args.startTimestamp!),
          q.lte(q.field('timestamp'), args.endTimestamp!)
        )
      )
    }

    const usage = await usageQuery.collect()

    // Filter by model if specified
    const filteredUsage = args.model
      ? usage.filter(record => record.model === args.model)
      : usage

    // Group by time interval
    const groupedData = new Map<
      string,
      { cost: number; tokens: number; requests: number }
    >()

    filteredUsage.forEach(record => {
      const date = new Date(record.timestamp)
      let key: string

      switch (args.interval) {
        case 'day':
          key = date.toISOString().split('T')[0] // YYYY-MM-DD
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          key = date.toISOString().split('T')[0]
      }

      const existing = groupedData.get(key) || {
        cost: 0,
        tokens: 0,
        requests: 0,
      }
      groupedData.set(key, {
        cost: existing.cost + record.cost,
        tokens: existing.tokens + record.tokensUsed,
        requests: existing.requests + 1,
      })
    })

    // Convert to array format for charts
    return Array.from(groupedData.entries())
      .map(([period, data]) => ({
        period,
        ...data,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  },
})

/**
 * Get all team members from the user collection
 */
export const getTeamMembers = query({
  args: {},
  handler: async ctx => {
    const users = await ctx.db.query('users').collect()

    return users.map(user => ({
      id: user._id,
      name: user.name || user.email || 'Unknown User',
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      joinedAt: user.joinedAt,
      clerkId: user.clerkId,
    }))
  },
})

/**
 * Get real-time usage metrics for the dashboard
 * Calculates metrics for the last 24 hours and overall totals
 */
export const getRealTimeMetrics = query({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const last24Hours = now - 24 * 60 * 60 * 1000

    // Get all usage data
    const allUsage = await ctx.db.query('usage').collect()

    // Get usage from last 24 hours
    const recentUsage = allUsage.filter(
      record => record.timestamp >= last24Hours
    )

    // Get all messages for total count
    const allMessages = await ctx.db.query('messages').collect()
    const recentMessages = allMessages.filter(
      message => message.timestamp >= last24Hours
    )

    // Get all conversations for active count
    const allConversations = await ctx.db.query('conversations').collect()
    const activeConversations = allConversations.filter(conv => conv.isActive)

    // Calculate totals
    const totalCost = allUsage.reduce((sum, record) => sum + record.cost, 0)
    const totalTokens = allUsage.reduce(
      (sum, record) => sum + record.tokensUsed,
      0
    )
    const totalRequests = allUsage.length

    // Calculate 24h metrics
    const cost24h = recentUsage.reduce((sum, record) => sum + record.cost, 0)
    const tokens24h = recentUsage.reduce(
      (sum, record) => sum + record.tokensUsed,
      0
    )
    const requests24h = recentUsage.length
    const messages24h = recentMessages.length

    // Get model breakdown for recent usage
    const modelBreakdown = new Map<
      string,
      { cost: number; tokens: number; requests: number }
    >()

    recentUsage.forEach(record => {
      const existing = modelBreakdown.get(record.model) || {
        cost: 0,
        tokens: 0,
        requests: 0,
      }
      modelBreakdown.set(record.model, {
        cost: existing.cost + record.cost,
        tokens: existing.tokens + record.tokensUsed,
        requests: existing.requests + 1,
      })
    })

    return {
      // Overall totals
      totalCost,
      totalTokens,
      totalRequests,
      totalMessages: allMessages.length,
      totalConversations: allConversations.length,
      activeConversations: activeConversations.length,

      // Last 24 hours
      last24Hours: {
        cost: cost24h,
        tokens: tokens24h,
        requests: requests24h,
        messages: messages24h,
      },

      // Model breakdown (last 24h)
      modelBreakdown: Array.from(modelBreakdown.entries()).map(
        ([model, data]) => ({
          model,
          ...data,
        })
      ),

      // Average costs
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      averageTokensPerRequest:
        totalRequests > 0 ? totalTokens / totalRequests : 0,
    }
  },
})

/**
 * Get usage trends over time periods
 * Useful for showing growth/decline patterns
 */
export const getUsageTrends = query({
  args: {
    days: v.optional(v.number()), // Default to 30 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 30
    const now = Date.now()
    const startTime = now - days * 24 * 60 * 60 * 1000

    const usage = await ctx.db
      .query('usage')
      .filter(q => q.gte(q.field('timestamp'), startTime))
      .collect()

    // Group by day
    const dailyData = new Map<
      string,
      { cost: number; tokens: number; requests: number }
    >()

    usage.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0]
      const existing = dailyData.get(date) || {
        cost: 0,
        tokens: 0,
        requests: 0,
      }
      dailyData.set(date, {
        cost: existing.cost + record.cost,
        tokens: existing.tokens + record.tokensUsed,
        requests: existing.requests + 1,
      })
    })

    // Fill in missing days with zero values
    const result = []
    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const data = dailyData.get(dateKey) || { cost: 0, tokens: 0, requests: 0 }

      result.unshift({
        date: dateKey,
        ...data,
      })
    }

    return result
  },
})
