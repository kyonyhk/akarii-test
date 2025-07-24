import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Helper function to calculate time window start
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
      return 0 // Beginning of time
    default:
      return today.getTime()
  }
}

// Get current usage for a team within a time window
export const getTeamUsageInWindow = query({
  args: {
    teamId: v.id('teams'),
    timeWindow: v.union(
      v.literal('daily'),
      v.literal('weekly'),
      v.literal('monthly'),
      v.literal('total')
    ),
  },
  handler: async (ctx, args) => {
    const windowStart = getTimeWindowStart(args.timeWindow)
    
    // Get usage from usageMetrics table
    const usageRecords = await ctx.db
      .query('usageMetrics')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .filter((q) => q.gte(q.field('timestamp'), windowStart))
      .collect()

    const totalTokens = usageRecords.reduce((sum, record) => sum + record.totalTokens, 0)
    const totalCost = usageRecords.reduce((sum, record) => sum + record.cost, 0)
    const requestCount = usageRecords.length

    return {
      totalTokens,
      totalCost,
      requestCount,
      timeWindow: args.timeWindow,
      windowStart,
      recordCount: usageRecords.length,
    }
  },
})

// Check all teams for alert conditions
export const checkAllTeamAlerts = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query('teams').collect()
    const alertsTriggered = []

    for (const team of teams) {
      const teamAlerts = await checkTeamAlerts(ctx, { teamId: team._id })
      if (teamAlerts.length > 0) {
        alertsTriggered.push({
          teamId: team._id,
          teamName: team.name,
          alerts: teamAlerts,
        })
      }
    }

    return alertsTriggered
  },
})

// Check alerts for a specific team
export const checkTeamAlerts = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    // Get active alert configurations for the team
    const alertConfigs = await ctx.db
      .query('alertConfigurations')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const triggeredAlerts = []

    for (const config of alertConfigs) {
      // Get current usage for the time window
      const usage = await getTeamUsageInWindow(ctx, {
        teamId: args.teamId,
        timeWindow: config.timeWindow,
      })

      let currentValue = 0
      let shouldTrigger = false
      let isWarning = false

      // Determine current value based on alert type
      switch (config.alertType) {
        case 'token_limit':
          currentValue = usage.totalTokens
          break
        case 'cost_limit':
          currentValue = usage.totalCost
          break
        case 'daily_usage':
        case 'monthly_usage':
          currentValue = config.thresholdUnit === 'tokens' ? usage.totalTokens : usage.totalCost
          break
      }

      // Check if warning threshold is exceeded
      if (config.warningThreshold && currentValue >= config.warningThreshold) {
        shouldTrigger = true
        isWarning = true
      }

      // Check if main threshold is exceeded
      if (currentValue >= config.thresholdValue) {
        shouldTrigger = true
        isWarning = false
      }

      if (shouldTrigger) {
        // Check if we've already sent this alert recently (avoid spam)
        const recentAlert = await ctx.db
          .query('alertHistory')
          .withIndex('by_alert_config', (q) => q.eq('alertConfigId', config._id))
          .filter((q) => 
            q.and(
              q.eq(q.field('isWarning'), isWarning),
              q.eq(q.field('resolvedAt'), undefined),
              q.gte(q.field('createdAt'), Date.now() - 3600000) // Within last hour
            )
          )
          .first()

        if (!recentAlert) {
          triggeredAlerts.push({
            config,
            currentValue,
            isWarning,
            usage,
          })
        }
      }
    }

    return triggeredAlerts
  },
})

// Record an alert in history
export const recordAlert = mutation({
  args: {
    alertConfigId: v.id('alertConfigurations'),
    teamId: v.id('teams'),
    alertType: v.string(),
    thresholdValue: v.number(),
    actualValue: v.number(),
    isWarning: v.boolean(),
    notificationsSent: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const alertId = await ctx.db.insert('alertHistory', {
      alertConfigId: args.alertConfigId,
      teamId: args.teamId,
      alertType: args.alertType,
      thresholdValue: args.thresholdValue,
      actualValue: args.actualValue,
      isWarning: args.isWarning,
      notificationsSent: args.notificationsSent,
      createdAt: Date.now(),
    })

    return alertId
  },
})

// Resolve an alert (mark as handled)
export const resolveAlert = mutation({
  args: { alertId: v.id('alertHistory') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      resolvedAt: Date.now(),
    })

    return await ctx.db.get(args.alertId)
  },
})

// Get alert history for a team
export const getTeamAlertHistory = query({
  args: { 
    teamId: v.id('teams'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query('alertHistory')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .order('desc')

    if (args.limit) {
      return await query.take(args.limit)
    }

    return await query.collect()
  },
})

// Get unresolved alerts for a team
export const getUnresolvedAlerts = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query('alertHistory')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .filter((q) => q.eq(q.field('resolvedAt'), undefined))
      .order('desc')
      .collect()

    return alerts
  },
})

// Check if team is currently at or over any hard limits
export const checkUsageLimits = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const usageLimits = await ctx.db
      .query('usageLimits')
      .withIndex('by_team', (q) => q.eq('teamId', args.teamId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const violations = []

    for (const limit of usageLimits) {
      const usage = await getTeamUsageInWindow(ctx, {
        teamId: args.teamId,
        timeWindow: limit.timeWindow,
      })

      let currentValue = 0
      switch (limit.limitType) {
        case 'hard_token_limit':
          currentValue = usage.totalTokens
          break
        case 'hard_cost_limit':
          currentValue = usage.totalCost
          break
        case 'rate_limit':
          currentValue = usage.requestCount
          break
      }

      if (currentValue >= limit.limitValue) {
        violations.push({
          limit,
          currentValue,
          usage,
          shouldBlock: limit.enforcementAction === 'block_requests',
          requiresApproval: limit.enforcementAction === 'require_approval',
        })
      }
    }

    return violations
  },
})

// Get comprehensive alert status for a team
export const getTeamAlertStatus = query({
  args: { teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const [
      activeConfigs,
      currentAlerts,
      unresolvedAlerts,
      usageLimitViolations,
    ] = await Promise.all([
      ctx.runQuery('alert_configs:getActiveAlertConfigs', { teamId: args.teamId }),
      checkTeamAlerts(ctx, { teamId: args.teamId }),
      getUnresolvedAlerts(ctx, { teamId: args.teamId }),
      checkUsageLimits(ctx, { teamId: args.teamId }),
    ])

    return {
      configCount: activeConfigs?.length || 0,
      currentAlerts: currentAlerts.length,
      unresolvedAlerts: unresolvedAlerts.length,
      usageLimitViolations: usageLimitViolations.length,
      hasActiveBlocks: usageLimitViolations.some(v => v.shouldBlock),
      alerts: currentAlerts,
      violations: usageLimitViolations,
    }
  },
})

// Get all alert history before a timestamp (for cleanup)
export const getAllAlertHistory = query({
  args: { beforeTimestamp: v.number() },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query('alertHistory')
      .withIndex('by_created_at')
      .filter((q) => q.lt(q.field('createdAt'), args.beforeTimestamp))
      .collect()

    return alerts
  },
})

// Delete alert history record
export const deleteAlertHistory = mutation({
  args: { alertId: v.id('alertHistory') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.alertId)
    return { success: true }
  },
})