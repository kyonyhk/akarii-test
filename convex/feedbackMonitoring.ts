import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'

// Setup default thresholds for the system
export const initializeThresholds = mutation({
  args: {},
  handler: async ctx => {
    const existing = await ctx.db.query('feedbackThresholds').collect()
    if (existing.length > 0) {
      return { message: 'Thresholds already initialized' }
    }

    const defaultThresholds = [
      {
        name: 'overall_approval_rate',
        threshold: 0.7, // 70%
        window: '24h',
        metric: 'approval_rate' as const,
        action: 'immediate' as const,
        isActive: true,
      },
      {
        name: 'question_approval_rate',
        threshold: 0.5, // 50%
        window: '7d',
        metric: 'approval_rate' as const,
        action: 'immediate' as const,
        isActive: true,
      },
      {
        name: 'confidence_calibration_gap',
        threshold: 0.3, // 30% gap between confidence and approval
        window: '24h',
        metric: 'confidence_gap' as const,
        action: 'batch' as const,
        isActive: true,
      },
      {
        name: 'low_vote_count_alert',
        threshold: 2.0, // Less than 2 votes per analysis
        window: '24h',
        metric: 'vote_count' as const,
        action: 'scheduled' as const,
        isActive: true,
      },
    ]

    const now = Date.now()
    for (const threshold of defaultThresholds) {
      await ctx.db.insert('feedbackThresholds', {
        ...threshold,
        createdAt: now,
        updatedAt: now,
      })
    }

    return {
      message: 'Default thresholds initialized',
      count: defaultThresholds.length,
    }
  },
})

// Get all active thresholds
export const getActiveThresholds = query({
  args: {},
  handler: async ctx => {
    return await ctx.db
      .query('feedbackThresholds')
      .withIndex('by_active', q => q.eq('isActive', true))
      .collect()
  },
})

// Calculate metrics for threshold monitoring
export const calculateFeedbackMetrics = query({
  args: {
    windowHours: v.number(),
    statementType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const windowStart = Date.now() - args.windowHours * 60 * 60 * 1000

    // Get analyses from the time window
    let analysesQuery = ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', windowStart))

    const analyses = await analysesQuery.collect()

    // Filter by statement type if specified
    const filteredAnalyses = args.statementType
      ? analyses.filter(a => a.statementType === args.statementType)
      : analyses

    if (filteredAnalyses.length === 0) {
      return {
        approvalRate: 0,
        voteCount: 0,
        averageVotesPerAnalysis: 0,
        confidenceAccuracy: 0,
        confidenceGap: 0,
        totalAnalyses: 0,
        windowStart,
        windowEnd: Date.now(),
      }
    }

    // Calculate metrics
    const totalVotes = filteredAnalyses.reduce(
      (sum, a) => sum + a.thumbsUp + a.thumbsDown,
      0
    )
    const totalUpvotes = filteredAnalyses.reduce(
      (sum, a) => sum + a.thumbsUp,
      0
    )
    const approvalRate = totalVotes > 0 ? totalUpvotes / totalVotes : 0
    const averageVotesPerAnalysis = totalVotes / filteredAnalyses.length

    // Calculate confidence accuracy (correlation between confidence and approval)
    const analysesWithVotes = filteredAnalyses.filter(
      a => a.thumbsUp + a.thumbsDown > 0
    )
    let confidenceAccuracy = 0
    let confidenceGap = 0

    if (analysesWithVotes.length > 0) {
      const confidenceApprovalPairs = analysesWithVotes.map(a => ({
        confidence: a.confidenceLevel / 100,
        approval: a.thumbsUp / (a.thumbsUp + a.thumbsDown),
      }))

      // Simple correlation calculation
      const avgConfidence =
        confidenceApprovalPairs.reduce((sum, p) => sum + p.confidence, 0) /
        confidenceApprovalPairs.length
      const avgApproval =
        confidenceApprovalPairs.reduce((sum, p) => sum + p.approval, 0) /
        confidenceApprovalPairs.length

      const numerator = confidenceApprovalPairs.reduce(
        (sum, p) =>
          sum + (p.confidence - avgConfidence) * (p.approval - avgApproval),
        0
      )
      const denomConfidence = Math.sqrt(
        confidenceApprovalPairs.reduce(
          (sum, p) => sum + Math.pow(p.confidence - avgConfidence, 2),
          0
        )
      )
      const denomApproval = Math.sqrt(
        confidenceApprovalPairs.reduce(
          (sum, p) => sum + Math.pow(p.approval - avgApproval, 2),
          0
        )
      )

      confidenceAccuracy =
        denomConfidence > 0 && denomApproval > 0
          ? numerator / (denomConfidence * denomApproval)
          : 0

      // Calculate average gap between confidence and approval
      confidenceGap =
        confidenceApprovalPairs.reduce(
          (sum, p) => sum + Math.abs(p.confidence - p.approval),
          0
        ) / confidenceApprovalPairs.length
    }

    return {
      approvalRate,
      voteCount: totalVotes,
      averageVotesPerAnalysis,
      confidenceAccuracy,
      confidenceGap,
      totalAnalyses: filteredAnalyses.length,
      windowStart,
      windowEnd: Date.now(),
    }
  },
})

// Check for threshold breaches (internal for cron jobs)
export const checkThresholdBreaches = internalMutation({
  args: {},
  handler: async ctx => {
    const thresholds = await ctx.db
      .query('feedbackThresholds')
      .withIndex('by_active', q => q.eq('isActive', true))
      .collect()

    const breaches = []

    for (const threshold of thresholds) {
      const windowHours = parseWindowToHours(threshold.window)
      const windowStart = Date.now() - windowHours * 60 * 60 * 1000

      let metrics
      if (threshold.name.includes('question')) {
        metrics = await calculateFeedbackMetrics(ctx, {
          windowHours,
          statementType: 'question',
        })
      } else {
        metrics = await calculateFeedbackMetrics(ctx, { windowHours })
      }

      let currentValue
      let breached = false

      switch (threshold.metric) {
        case 'approval_rate':
          currentValue = metrics.approvalRate
          breached = currentValue < threshold.threshold
          break
        case 'vote_count':
          currentValue = metrics.averageVotesPerAnalysis
          breached = currentValue < threshold.threshold
          break
        case 'confidence_gap':
          currentValue = metrics.confidenceGap
          breached = currentValue > threshold.threshold
          break
      }

      if (breached) {
        // Check if we already have a recent alert for this threshold
        const recentAlerts = await ctx.db
          .query('thresholdAlerts')
          .withIndex('by_threshold', q => q.eq('thresholdId', threshold._id))
          .filter(q => q.gte(q.field('createdAt'), windowStart))
          .collect()

        if (recentAlerts.length === 0) {
          // Get affected analyses
          const analyses = await ctx.db
            .query('analyses')
            .withIndex('by_created_at', q => q.gte('createdAt', windowStart))
            .collect()

          const affectedAnalyses = threshold.name.includes('question')
            ? analyses
                .filter(a => a.statementType === 'question')
                .map(a => a._id)
            : analyses.map(a => a._id)

          const alertId = await ctx.db.insert('thresholdAlerts', {
            thresholdId: threshold._id,
            breachValue: currentValue,
            breachTime: Date.now(),
            windowStart,
            windowEnd: Date.now(),
            affectedAnalyses,
            status: 'pending',
            createdAt: Date.now(),
          })

          breaches.push({
            alertId,
            thresholdName: threshold.name,
            expectedValue: threshold.threshold,
            actualValue: currentValue,
            action: threshold.action,
            affectedCount: affectedAnalyses.length,
          })
        }
      }
    }

    return { breaches, timestamp: Date.now() }
  },
})

// Get pending threshold alerts
export const getPendingAlerts = query({
  args: {},
  handler: async ctx => {
    const alerts = await ctx.db
      .query('thresholdAlerts')
      .withIndex('by_status', q => q.eq('status', 'pending'))
      .order('desc')
      .collect()

    const enrichedAlerts = []
    for (const alert of alerts) {
      const threshold = await ctx.db.get(alert.thresholdId)
      if (threshold) {
        enrichedAlerts.push({
          ...alert,
          threshold,
        })
      }
    }

    return enrichedAlerts
  },
})

// Acknowledge an alert
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id('thresholdAlerts'),
    acknowledgedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      status: 'acknowledged',
      resolvedBy: args.acknowledgedBy,
      resolvedAt: Date.now(),
    })

    return { success: true }
  },
})

// Get threshold monitoring dashboard data
export const getMonitoringDashboard = query({
  args: {},
  handler: async ctx => {
    const thresholds = await getActiveThresholds(ctx, {})
    const pendingAlerts = await getPendingAlerts(ctx, {})

    // Calculate current metrics for each threshold
    const currentMetrics = []
    for (const threshold of thresholds) {
      const windowHours = parseWindowToHours(threshold.window)
      const metrics = await calculateFeedbackMetrics(ctx, {
        windowHours,
        statementType: threshold.name.includes('question')
          ? 'question'
          : undefined,
      })

      let currentValue
      switch (threshold.metric) {
        case 'approval_rate':
          currentValue = metrics.approvalRate
          break
        case 'vote_count':
          currentValue = metrics.averageVotesPerAnalysis
          break
        case 'confidence_gap':
          currentValue = metrics.confidenceGap
          break
      }

      currentMetrics.push({
        threshold,
        currentValue,
        metrics,
        isBreached:
          threshold.metric === 'confidence_gap'
            ? currentValue > threshold.threshold
            : currentValue < threshold.threshold,
      })
    }

    return {
      thresholds: currentMetrics,
      pendingAlerts,
      lastChecked: Date.now(),
    }
  },
})

// Utility function to parse window strings to hours
function parseWindowToHours(window: string): number {
  const value = parseInt(window.slice(0, -1))
  const unit = window.slice(-1)

  switch (unit) {
    case 'h':
      return value
    case 'd':
      return value * 24
    case 'w':
      return value * 24 * 7
    default:
      return 24 // Default to 24 hours
  }
}

// Update threshold configuration
export const updateThreshold = mutation({
  args: {
    thresholdId: v.id('feedbackThresholds'),
    threshold: v.optional(v.number()),
    window: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const updates: any = { updatedAt: Date.now() }

    if (args.threshold !== undefined) updates.threshold = args.threshold
    if (args.window !== undefined) updates.window = args.window
    if (args.isActive !== undefined) updates.isActive = args.isActive

    await ctx.db.patch(args.thresholdId, updates)
    return { success: true }
  },
})

// Public wrapper for manual threshold checking
export const manualThresholdCheck = mutation({
  args: {},
  handler: async ctx => {
    return await checkThresholdBreaches(ctx, {})
  },
})
