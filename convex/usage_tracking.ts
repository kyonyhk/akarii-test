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

// Get daily usage aggregation for charts and analytics
export const getDailyUsageAggregation = query({
  args: {
    teamId: v.optional(v.id('teams')),
    userId: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
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

    const usage = await baseQuery
      .filter(q =>
        q.and(
          q.gte(q.field('timestamp'), args.startDate),
          q.lte(q.field('timestamp'), args.endDate)
        )
      )
      .collect()

    // Group by day (convert timestamp to day string for grouping)
    const dailyUsage = new Map<
      string,
      {
        date: string
        totalTokens: number
        totalCost: number
        requestCount: number
        inputTokens: number
        outputTokens: number
        operationBreakdown: Record<string, number>
        modelBreakdown: Record<string, number>
      }
    >()

    usage.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0]

      if (!dailyUsage.has(date)) {
        dailyUsage.set(date, {
          date,
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          operationBreakdown: {},
          modelBreakdown: {},
        })
      }

      const dayData = dailyUsage.get(date)!
      dayData.totalTokens += record.totalTokens
      dayData.totalCost += record.cost
      dayData.requestCount += 1
      dayData.inputTokens += record.inputTokens
      dayData.outputTokens += record.outputTokens

      // Track operations breakdown
      dayData.operationBreakdown[record.operationType] =
        (dayData.operationBreakdown[record.operationType] || 0) + 1

      // Track model breakdown
      dayData.modelBreakdown[record.model] =
        (dayData.modelBreakdown[record.model] || 0) + record.totalTokens
    })

    return Array.from(dailyUsage.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )
  },
})

// Get weekly usage aggregation
export const getWeeklyUsageAggregation = query({
  args: {
    teamId: v.optional(v.id('teams')),
    userId: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
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

    const usage = await baseQuery
      .filter(q =>
        q.and(
          q.gte(q.field('timestamp'), args.startDate),
          q.lte(q.field('timestamp'), args.endDate)
        )
      )
      .collect()

    // Group by week (Monday to Sunday)
    const weeklyUsage = new Map<
      string,
      {
        weekStart: string
        weekEnd: string
        totalTokens: number
        totalCost: number
        requestCount: number
        inputTokens: number
        outputTokens: number
        operationBreakdown: Record<string, number>
        modelBreakdown: Record<string, number>
      }
    >()

    usage.forEach(record => {
      const date = new Date(record.timestamp)
      const dayOfWeek = date.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const mondayDate = new Date(date)
      mondayDate.setDate(date.getDate() + mondayOffset)

      const weekStart = mondayDate.toISOString().split('T')[0]
      const sundayDate = new Date(mondayDate)
      sundayDate.setDate(mondayDate.getDate() + 6)
      const weekEnd = sundayDate.toISOString().split('T')[0]

      if (!weeklyUsage.has(weekStart)) {
        weeklyUsage.set(weekStart, {
          weekStart,
          weekEnd,
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          operationBreakdown: {},
          modelBreakdown: {},
        })
      }

      const weekData = weeklyUsage.get(weekStart)!
      weekData.totalTokens += record.totalTokens
      weekData.totalCost += record.cost
      weekData.requestCount += 1
      weekData.inputTokens += record.inputTokens
      weekData.outputTokens += record.outputTokens

      // Track operations breakdown
      weekData.operationBreakdown[record.operationType] =
        (weekData.operationBreakdown[record.operationType] || 0) + 1

      // Track model breakdown
      weekData.modelBreakdown[record.model] =
        (weekData.modelBreakdown[record.model] || 0) + record.totalTokens
    })

    return Array.from(weeklyUsage.values()).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart)
    )
  },
})

// Get monthly usage aggregation
export const getMonthlyUsageAggregation = query({
  args: {
    teamId: v.optional(v.id('teams')),
    userId: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
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

    const usage = await baseQuery
      .filter(q =>
        q.and(
          q.gte(q.field('timestamp'), args.startDate),
          q.lte(q.field('timestamp'), args.endDate)
        )
      )
      .collect()

    // Group by month (YYYY-MM format)
    const monthlyUsage = new Map<
      string,
      {
        month: string
        totalTokens: number
        totalCost: number
        requestCount: number
        inputTokens: number
        outputTokens: number
        operationBreakdown: Record<string, number>
        modelBreakdown: Record<string, number>
        uniqueUsers: Set<string>
      }
    >()

    usage.forEach(record => {
      const date = new Date(record.timestamp)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyUsage.has(month)) {
        monthlyUsage.set(month, {
          month,
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          operationBreakdown: {},
          modelBreakdown: {},
          uniqueUsers: new Set(),
        })
      }

      const monthData = monthlyUsage.get(month)!
      monthData.totalTokens += record.totalTokens
      monthData.totalCost += record.cost
      monthData.requestCount += 1
      monthData.inputTokens += record.inputTokens
      monthData.outputTokens += record.outputTokens
      monthData.uniqueUsers.add(record.userId)

      // Track operations breakdown
      monthData.operationBreakdown[record.operationType] =
        (monthData.operationBreakdown[record.operationType] || 0) + 1

      // Track model breakdown
      monthData.modelBreakdown[record.model] =
        (monthData.modelBreakdown[record.model] || 0) + record.totalTokens
    })

    // Convert Set to count for serialization
    return Array.from(monthlyUsage.values())
      .map(data => ({
        ...data,
        uniqueUserCount: data.uniqueUsers.size,
        uniqueUsers: undefined, // Remove Set for serialization
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  },
})

// Get team member usage breakdown
export const getTeamMemberUsageBreakdown = query({
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

    const usage = await query.collect()

    // Group by user
    const userUsage = new Map<
      string,
      {
        userId: string
        totalTokens: number
        totalCost: number
        requestCount: number
        inputTokens: number
        outputTokens: number
        operationBreakdown: Record<string, number>
        modelBreakdown: Record<string, number>
        lastActivity: number
      }
    >()

    usage.forEach(record => {
      if (!userUsage.has(record.userId)) {
        userUsage.set(record.userId, {
          userId: record.userId,
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          operationBreakdown: {},
          modelBreakdown: {},
          lastActivity: 0,
        })
      }

      const userData = userUsage.get(record.userId)!
      userData.totalTokens += record.totalTokens
      userData.totalCost += record.cost
      userData.requestCount += 1
      userData.inputTokens += record.inputTokens
      userData.outputTokens += record.outputTokens
      userData.lastActivity = Math.max(userData.lastActivity, record.timestamp)

      // Track operations breakdown
      userData.operationBreakdown[record.operationType] =
        (userData.operationBreakdown[record.operationType] || 0) + 1

      // Track model breakdown
      userData.modelBreakdown[record.model] =
        (userData.modelBreakdown[record.model] || 0) + record.totalTokens
    })

    return Array.from(userUsage.values()).sort(
      (a, b) => b.totalCost - a.totalCost // Sort by cost descending
    )
  },
})

// Get usage trends (comparing current period to previous period)
export const getUsageTrends = query({
  args: {
    teamId: v.optional(v.id('teams')),
    userId: v.optional(v.string()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    previousPeriodStart: v.number(),
    previousPeriodEnd: v.number(),
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

    // Get current period usage
    const currentUsage = await baseQuery
      .filter(q =>
        q.and(
          q.gte(q.field('timestamp'), args.currentPeriodStart),
          q.lte(q.field('timestamp'), args.currentPeriodEnd)
        )
      )
      .collect()

    // Get previous period usage
    const previousUsage = await baseQuery
      .filter(q =>
        q.and(
          q.gte(q.field('timestamp'), args.previousPeriodStart),
          q.lte(q.field('timestamp'), args.previousPeriodEnd)
        )
      )
      .collect()

    // Calculate stats for both periods
    const calculateStats = (usage: typeof currentUsage) => {
      return usage.reduce(
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
    }

    const currentStats = calculateStats(currentUsage)
    const previousStats = calculateStats(previousUsage)

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    return {
      current: currentStats,
      previous: previousStats,
      trends: {
        tokenChange: calculateChange(
          currentStats.totalTokens,
          previousStats.totalTokens
        ),
        costChange: calculateChange(
          currentStats.totalCost,
          previousStats.totalCost
        ),
        requestChange: calculateChange(
          currentStats.requestCount,
          previousStats.requestCount
        ),
        inputTokenChange: calculateChange(
          currentStats.inputTokens,
          previousStats.inputTokens
        ),
        outputTokenChange: calculateChange(
          currentStats.outputTokens,
          previousStats.outputTokens
        ),
      },
    }
  },
})

// Get top usage statistics (most active users/teams, most expensive operations, etc.)
export const getTopUsageStats = query({
  args: {
    teamId: v.optional(v.id('teams')),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10

    let query

    if (args.teamId) {
      query = ctx.db
        .query('usageMetrics')
        .withIndex('by_team', q => q.eq('teamId', args.teamId))
    } else {
      query = ctx.db.query('usageMetrics')
    }

    if (args.startDate) {
      query = query.filter(q => q.gte(q.field('timestamp'), args.startDate!))
    }

    if (args.endDate) {
      query = query.filter(q => q.lte(q.field('timestamp'), args.endDate!))
    }

    const usage = await query.collect()

    // Group by different dimensions for top stats
    const userStats = new Map<string, number>()
    const modelStats = new Map<string, number>()
    const operationStats = new Map<string, number>()
    const teamStats = new Map<string, number>()

    usage.forEach(record => {
      // User stats (by cost)
      userStats.set(
        record.userId,
        (userStats.get(record.userId) || 0) + record.cost
      )

      // Model stats (by tokens)
      modelStats.set(
        record.model,
        (modelStats.get(record.model) || 0) + record.totalTokens
      )

      // Operation stats (by count)
      operationStats.set(
        record.operationType,
        (operationStats.get(record.operationType) || 0) + 1
      )

      // Team stats (by cost, if teamId exists)
      if (record.teamId) {
        teamStats.set(
          record.teamId,
          (teamStats.get(record.teamId) || 0) + record.cost
        )
      }
    })

    // Convert to sorted arrays
    const topUsers = Array.from(userStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([userId, cost]) => ({ userId, cost }))

    const topModels = Array.from(modelStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([model, tokens]) => ({ model, tokens }))

    const topOperations = Array.from(operationStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([operation, count]) => ({ operation, count }))

    const topTeams = Array.from(teamStats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([teamId, cost]) => ({ teamId, cost }))

    return {
      topUsersByCost: topUsers,
      topModelsByTokens: topModels,
      topOperationsByCount: topOperations,
      topTeamsByCost: args.teamId ? [] : topTeams, // Only include if not filtered by team
    }
  },
})

// Get recent usage records for health checks
export const getRecentUsage = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const usage = await ctx.db
      .query('usageMetrics')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit || 10)

    return usage
  },
})
