import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'

// Calculate daily learning metrics
export const calculateDailyMetrics = internalMutation({
  args: {
    date: v.optional(v.string()), // Format: 'YYYY-MM-DD'
  },
  handler: async (ctx, args) => {
    const date = args.date || new Date().toISOString().split('T')[0]
    const startOfDay = new Date(`${date}T00:00:00.000Z`).getTime()
    const endOfDay = new Date(`${date}T23:59:59.999Z`).getTime()

    // Check if metrics already exist for this date
    const existingMetrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_date', q => q.eq('date', date))
      .first()

    // Calculate improvement cycles (proposals created and deployed)
    const proposalsCreated = await ctx.db
      .query('promptProposals')
      .withIndex('by_created_at', q =>
        q.gte('createdAt', startOfDay).lte('createdAt', endOfDay)
      )
      .collect()

    const successfulChanges = proposalsCreated.filter(
      p => p.status === 'deployed'
    ).length
    const rollbackCount = 0 // Would need to track rollbacks in schema

    // Calculate average approval gain from successful deployments
    let averageApprovalGain = 0
    if (successfulChanges > 0) {
      // This would require tracking before/after metrics
      // For now, use expected improvement as proxy
      const totalExpectedGain = proposalsCreated
        .filter(p => p.status === 'deployed')
        .reduce((sum, p) => sum + p.expectedImprovement, 0)
      averageApprovalGain = totalExpectedGain / successfulChanges
    }

    // Calculate current system metrics
    const recentAnalyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', startOfDay))
      .collect()

    let overallApprovalRate = 0
    let questionApprovalRate = 0
    let confidenceCalibrationGap = 0

    if (recentAnalyses.length > 0) {
      const totalVotes = recentAnalyses.reduce(
        (sum, a) => sum + a.thumbsUp + a.thumbsDown,
        0
      )
      const totalUpvotes = recentAnalyses.reduce(
        (sum, a) => sum + a.thumbsUp,
        0
      )
      overallApprovalRate = totalVotes > 0 ? totalUpvotes / totalVotes : 0

      // Question-specific approval rate
      const questionAnalyses = recentAnalyses.filter(
        a => a.statementType === 'question'
      )
      if (questionAnalyses.length > 0) {
        const questionVotes = questionAnalyses.reduce(
          (sum, a) => sum + a.thumbsUp + a.thumbsDown,
          0
        )
        const questionUpvotes = questionAnalyses.reduce(
          (sum, a) => sum + a.thumbsUp,
          0
        )
        questionApprovalRate =
          questionVotes > 0 ? questionUpvotes / questionVotes : 0
      }

      // Confidence calibration gap
      const analysesWithVotes = recentAnalyses.filter(
        a => a.thumbsUp + a.thumbsDown > 0
      )
      if (analysesWithVotes.length > 0) {
        const gaps = analysesWithVotes.map(a => {
          const confidence = a.confidenceLevel / 100
          const approval = a.thumbsUp / (a.thumbsUp + a.thumbsDown)
          return Math.abs(confidence - approval)
        })
        confidenceCalibrationGap =
          gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
      }
    }

    // Calculate time to improvement (average time from proposal to deployment)
    const deployedProposals = proposalsCreated.filter(
      p => p.status === 'deployed' && p.reviewedAt
    )
    const avgTimeToImprovement =
      deployedProposals.length > 0
        ? deployedProposals.reduce(
            (sum, p) => sum + (p.reviewedAt! - p.createdAt),
            0
          ) /
          deployedProposals.length /
          (1000 * 60) // Convert to minutes
        : 0

    const metrics = {
      date,
      improvementCycles: proposalsCreated.length,
      averageApprovalGain,
      successfulChanges,
      rollbackCount,
      timeToImprovement: avgTimeToImprovement,
      overallApprovalRate,
      questionApprovalRate,
      confidenceCalibrationGap,
      createdAt: Date.now(),
    }

    if (existingMetrics) {
      await ctx.db.patch(existingMetrics._id, metrics)
      return { ...metrics, updated: true }
    } else {
      const id = await ctx.db.insert('learningMetrics', metrics)
      return { ...metrics, _id: id, created: true }
    }
  },
})

// Get learning trend data
export const getLearningTrends = query({
  args: {
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)
    const cutoffString = cutoffDate.toISOString().split('T')[0]

    const metrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_date', q => q.gte('date', cutoffString))
      .collect()

    // Calculate trends
    const trends = {
      approvalRateTrend: calculateTrend(
        metrics.map(m => m.overallApprovalRate)
      ),
      questionApprovalTrend: calculateTrend(
        metrics.map(m => m.questionApprovalRate)
      ),
      confidenceCalibrationTrend: calculateTrend(
        metrics.map(m => m.confidenceCalibrationGap)
      ),
      improvementVelocityTrend: calculateTrend(
        metrics.map(m => m.successfulChanges)
      ),
      timeToImprovementTrend: calculateTrend(
        metrics.map(m => m.timeToImprovement)
      ),
    }

    return {
      metrics: metrics.sort((a, b) => a.date.localeCompare(b.date)),
      trends,
      summary: {
        totalImprovementCycles: metrics.reduce(
          (sum, m) => sum + m.improvementCycles,
          0
        ),
        totalSuccessfulChanges: metrics.reduce(
          (sum, m) => sum + m.successfulChanges,
          0
        ),
        averageApprovalRate:
          metrics.length > 0
            ? metrics.reduce((sum, m) => sum + m.overallApprovalRate, 0) /
              metrics.length
            : 0,
        currentQuestionApproval:
          metrics.length > 0
            ? metrics[metrics.length - 1].questionApprovalRate
            : 0,
        improvementRate:
          metrics.length > 1
            ? (metrics[metrics.length - 1].overallApprovalRate -
                metrics[0].overallApprovalRate) /
              daysBack
            : 0,
      },
    }
  },
})

// Get current learning status
export const getLearningStatus = query({
  args: {},
  handler: async ctx => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const [todayMetrics, yesterdayMetrics] = await Promise.all([
      ctx.db
        .query('learningMetrics')
        .withIndex('by_date', q => q.eq('date', today))
        .first(),
      ctx.db
        .query('learningMetrics')
        .withIndex('by_date', q => q.eq('date', yesterday))
        .first(),
    ])

    // Get current active improvement proposals
    const activeProposals = await ctx.db
      .query('promptProposals')
      .withIndex('by_status', q => q.eq('status', 'pending'))
      .collect()

    const testingProposals = await ctx.db
      .query('promptProposals')
      .withIndex('by_status', q => q.eq('status', 'testing'))
      .collect()

    // Get recent threshold alerts
    const recentAlerts = await ctx.db
      .query('thresholdAlerts')
      .withIndex('by_status', q => q.eq('status', 'pending'))
      .collect()

    // Calculate day-over-day changes
    const changes = {
      approvalRate:
        todayMetrics && yesterdayMetrics
          ? todayMetrics.overallApprovalRate -
            yesterdayMetrics.overallApprovalRate
          : 0,
      questionApproval:
        todayMetrics && yesterdayMetrics
          ? todayMetrics.questionApprovalRate -
            yesterdayMetrics.questionApprovalRate
          : 0,
      confidenceGap:
        todayMetrics && yesterdayMetrics
          ? todayMetrics.confidenceCalibrationGap -
            yesterdayMetrics.confidenceCalibrationGap
          : 0,
    }

    return {
      currentMetrics: todayMetrics,
      previousMetrics: yesterdayMetrics,
      dayOverDayChanges: changes,
      systemStatus: {
        pendingReviews: activeProposals.length,
        activeTesting: testingProposals.length,
        activeAlerts: recentAlerts.length,
        lastUpdate: todayMetrics?.createdAt || null,
      },
      healthScore: calculateHealthScore(todayMetrics, changes),
    }
  },
})

// Continuous learning pipeline orchestrator
export const runLearningPipeline = internalMutation({
  args: {},
  handler: async ctx => {
    const results = {
      timestamp: Date.now(),
      steps: [] as any[],
    }

    try {
      // Step 1: Update failure patterns
      const patternsResult = await ctx.runMutation(
        'improvementMapping:updateFailurePatterns',
        {}
      )
      results.steps.push({
        step: 'update_failure_patterns',
        success: true,
        data: patternsResult,
      })

      // Step 2: Check thresholds
      const thresholdResult = await ctx.runMutation(
        'feedbackMonitoring:checkThresholdBreaches',
        {}
      )
      results.steps.push({
        step: 'check_thresholds',
        success: true,
        data: thresholdResult,
      })

      // Step 3: Generate refinements if needed
      if (thresholdResult.breaches && thresholdResult.breaches.length > 0) {
        for (const breach of thresholdResult.breaches) {
          const refinementResult = await ctx.runMutation(
            'promptRefinement:analyzeFailurePatternsAndGenerateRefinements',
            {
              alertId: breach.alertId,
            }
          )
          results.steps.push({
            step: 'generate_refinements',
            success: true,
            alertId: breach.alertId,
            data: refinementResult,
          })
        }
      }

      // Step 4: Calculate daily metrics
      const metricsResult = await calculateDailyMetrics(ctx, {})
      results.steps.push({
        step: 'calculate_metrics',
        success: true,
        data: metricsResult,
      })

      return results
    } catch (error) {
      results.steps.push({
        step: 'pipeline_error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return results
    }
  },
})

// Manual trigger for learning pipeline (for testing)
export const manualLearningPipeline = mutation({
  args: {},
  handler: async ctx => {
    return await runLearningPipeline(ctx, {})
  },
})

// Generate learning insights and recommendations
export const generateLearningInsights = query({
  args: {},
  handler: async ctx => {
    const trends = await getLearningTrends(ctx, { daysBack: 30 })
    const status = await getLearningStatus(ctx, {})

    const insights = []
    const recommendations = []

    // Analyze approval rate trends
    if (trends.trends.approvalRateTrend.slope < -0.001) {
      insights.push({
        type: 'declining_performance',
        message: 'Overall approval rate is declining',
        severity: 'high',
        data: trends.trends.approvalRateTrend,
      })
      recommendations.push({
        action: 'immediate_review',
        message: 'Review recent prompt changes and consider rollback',
        priority: 'high',
      })
    }

    // Analyze question performance
    if (
      status.currentMetrics &&
      status.currentMetrics.questionApprovalRate < 0.5
    ) {
      insights.push({
        type: 'question_performance_low',
        message: `Question approval rate is ${(status.currentMetrics.questionApprovalRate * 100).toFixed(1)}%`,
        severity: 'high',
        data: { rate: status.currentMetrics.questionApprovalRate },
      })
      recommendations.push({
        action: 'focus_question_prompts',
        message: 'Prioritize question analysis improvements',
        priority: 'high',
      })
    }

    // Analyze improvement velocity
    const avgSuccessfulChanges =
      trends.summary.totalSuccessfulChanges / Math.max(1, trends.metrics.length)
    if (avgSuccessfulChanges < 0.5) {
      insights.push({
        type: 'slow_improvement_velocity',
        message: 'System improvement velocity is below target',
        severity: 'medium',
        data: { avgChanges: avgSuccessfulChanges },
      })
      recommendations.push({
        action: 'streamline_review_process',
        message:
          'Consider faster review cycles or automated approvals for low-risk changes',
        priority: 'medium',
      })
    }

    return {
      insights,
      recommendations,
      systemHealth: status.healthScore,
      lastAnalysis: Date.now(),
    }
  },
})

// Helper functions
function calculateTrend(values: number[]): {
  slope: number
  direction: string
  confidence: number
} {
  if (values.length < 2) return { slope: 0, direction: 'stable', confidence: 0 }

  const n = values.length
  const x = Array.from({ length: n }, (_, i) => i)
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const direction =
    slope > 0.001 ? 'improving' : slope < -0.001 ? 'declining' : 'stable'

  // Simple confidence based on consistency of trend
  const predicted = x.map(xi => slope * xi + sumY / n)
  const errors = values.map((yi, i) => Math.abs(yi - predicted[i]))
  const avgError = errors.reduce((a, b) => a + b, 0) / errors.length
  const confidence = Math.max(0, 1 - avgError * 2) // Simple confidence metric

  return { slope, direction, confidence }
}

function calculateHealthScore(currentMetrics: any, changes: any): number {
  if (!currentMetrics) return 50 // Neutral score if no data

  let score = 50 // Start with neutral

  // Approval rate contribution (40% of score)
  score += ((currentMetrics.overallApprovalRate - 0.7) * 40) / 0.3 // Scale around 70% target

  // Question approval contribution (30% of score)
  score += ((currentMetrics.questionApprovalRate - 0.5) * 30) / 0.5 // Scale around 50% target

  // Confidence calibration contribution (20% of score)
  score += ((0.2 - currentMetrics.confidenceCalibrationGap) * 20) / 0.2 // Lower gap is better

  // Trend contribution (10% of score)
  if (changes.approvalRate > 0) score += 5
  if (changes.questionApproval > 0) score += 5

  return Math.max(0, Math.min(100, Math.round(score)))
}
