/**
 * Quality Trend Monitoring and Alerting System
 * Monitors quality metrics over time and generates alerts for degradation
 */

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export interface QualityTrendData {
  timestamp: number
  overallScore: number
  dimensionScores: Record<string, number>
  displayRate: number
  humanReviewRate: number
  retryRate: number
  flagCounts: Record<string, number>
  analysisCount: number
}

export interface QualityAlert {
  id: string
  type:
    | 'quality_drop'
    | 'dimension_degradation'
    | 'high_failure_rate'
    | 'trend_alert'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metric: string
  currentValue: number
  threshold: number
  previousValue?: number
  trend: 'improving' | 'stable' | 'degrading'
  createdAt: number
  resolved: boolean
  actionRequired: boolean
}

// Quality monitoring thresholds
const QUALITY_THRESHOLDS = {
  overallScore: {
    critical: 50,
    high: 60,
    medium: 70,
    target: 80,
  },
  displayRate: {
    critical: 70,
    high: 80,
    medium: 85,
    target: 90,
  },
  humanReviewRate: {
    critical: 40,
    high: 30,
    medium: 20,
    target: 10,
  },
  retryRate: {
    critical: 30,
    high: 20,
    medium: 15,
    target: 10,
  },
} as const

/**
 * Record quality metrics for trend monitoring
 */
export const recordQualityMetrics = mutation({
  args: {
    timestamp: v.optional(v.number()),
    overallScore: v.number(),
    dimensionScores: v.any(),
    displayRate: v.number(),
    humanReviewRate: v.number(),
    retryRate: v.number(),
    flagCounts: v.any(),
    analysisCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Store in learningMetrics table (extending existing schema)
    const date = new Date(args.timestamp || Date.now())
      .toISOString()
      .split('T')[0]

    const existingMetrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_date', q => q.eq('date', date))
      .first()

    const metricsData = {
      date,
      improvementCycles: 0,
      averageApprovalGain: 0,
      successfulChanges: 0,
      rollbackCount: 0,
      timeToImprovement: 0,
      overallApprovalRate: args.overallScore / 100,
      questionApprovalRate: args.overallScore / 100,
      confidenceCalibrationGap: Math.abs(85 - args.overallScore) / 100,
      createdAt: args.timestamp || Date.now(),
      // Extended fields for quality monitoring
      qualityTrendData: {
        overallScore: args.overallScore,
        dimensionScores: args.dimensionScores,
        displayRate: args.displayRate,
        humanReviewRate: args.humanReviewRate,
        retryRate: args.retryRate,
        flagCounts: args.flagCounts,
        analysisCount: args.analysisCount,
      } as any,
    }

    if (existingMetrics) {
      await ctx.db.patch(existingMetrics._id, metricsData)
    } else {
      await ctx.db.insert('learningMetrics', metricsData)
    }

    // Check for quality degradation and create alerts
    await checkQualityAlerts(ctx, args)

    return { success: true }
  },
})

/**
 * Get quality trend data over time
 */
export const getQualityTrends = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    granularity: v.optional(
      v.union(v.literal('hour'), v.literal('day'), v.literal('week'))
    ),
  },
  handler: async (ctx, args) => {
    const startTime = new Date(args.startDate).getTime()
    const endTime = new Date(args.endDate).getTime()

    const metrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_date')
      .filter(q =>
        q.and(
          q.gte(q.field('createdAt'), startTime),
          q.lte(q.field('createdAt'), endTime)
        )
      )
      .order('asc')
      .collect()

    return metrics.map(metric => ({
      timestamp: metric.createdAt,
      date: metric.date,
      overallScore:
        (metric as any).qualityTrendData?.overallScore ||
        metric.overallApprovalRate * 100,
      dimensionScores: (metric as any).qualityTrendData?.dimensionScores || {},
      displayRate: (metric as any).qualityTrendData?.displayRate || 90,
      humanReviewRate: (metric as any).qualityTrendData?.humanReviewRate || 15,
      retryRate: (metric as any).qualityTrendData?.retryRate || 12,
      flagCounts: (metric as any).qualityTrendData?.flagCounts || {},
      analysisCount: (metric as any).qualityTrendData?.analysisCount || 0,
    }))
  },
})

/**
 * Get active quality alerts
 */
export const getQualityAlerts = query({
  args: {
    severity: v.optional(
      v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('critical')
      )
    ),
    resolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // For now, return simulated alerts based on recent data
    const recentMetrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_created_at')
      .order('desc')
      .take(5)

    const alerts: QualityAlert[] = []

    if (recentMetrics.length > 0) {
      const latest = recentMetrics[0]
      const qualityData = (latest as any).qualityTrendData

      // Check overall score alert
      if (qualityData?.overallScore < QUALITY_THRESHOLDS.overallScore.medium) {
        alerts.push({
          id: 'overall_score_low',
          type: 'quality_drop',
          severity:
            qualityData.overallScore < QUALITY_THRESHOLDS.overallScore.critical
              ? 'critical'
              : 'high',
          title: 'Overall Quality Score Below Threshold',
          description: `Quality score has dropped to ${qualityData.overallScore}, below target of ${QUALITY_THRESHOLDS.overallScore.target}`,
          metric: 'overall_score',
          currentValue: qualityData.overallScore,
          threshold: QUALITY_THRESHOLDS.overallScore.target,
          trend: 'degrading',
          createdAt: Date.now(),
          resolved: false,
          actionRequired: true,
        })
      }

      // Check display rate alert
      if (qualityData?.displayRate < QUALITY_THRESHOLDS.displayRate.medium) {
        alerts.push({
          id: 'display_rate_low',
          type: 'high_failure_rate',
          severity:
            qualityData.displayRate < QUALITY_THRESHOLDS.displayRate.critical
              ? 'critical'
              : 'medium',
          title: 'Low Analysis Display Rate',
          description: `Only ${qualityData.displayRate}% of analyses are being displayed due to quality issues`,
          metric: 'display_rate',
          currentValue: qualityData.displayRate,
          threshold: QUALITY_THRESHOLDS.displayRate.target,
          trend: 'stable',
          createdAt: Date.now(),
          resolved: false,
          actionRequired: true,
        })
      }

      // Check human review rate alert
      if (
        qualityData?.humanReviewRate > QUALITY_THRESHOLDS.humanReviewRate.medium
      ) {
        alerts.push({
          id: 'human_review_high',
          type: 'trend_alert',
          severity:
            qualityData.humanReviewRate >
            QUALITY_THRESHOLDS.humanReviewRate.critical
              ? 'high'
              : 'medium',
          title: 'High Human Review Rate',
          description: `${qualityData.humanReviewRate}% of analyses require human review, above target of ${QUALITY_THRESHOLDS.humanReviewRate.target}%`,
          metric: 'human_review_rate',
          currentValue: qualityData.humanReviewRate,
          threshold: QUALITY_THRESHOLDS.humanReviewRate.target,
          trend: 'degrading',
          createdAt: Date.now(),
          resolved: false,
          actionRequired: true,
        })
      }
    }

    // Filter by severity if specified
    if (args.severity) {
      return alerts.filter(alert => alert.severity === args.severity)
    }

    // Filter by resolved status if specified
    if (args.resolved !== undefined) {
      return alerts.filter(alert => alert.resolved === args.resolved)
    }

    return alerts
  },
})

/**
 * Calculate quality trend analysis
 */
export const analyzeQualityTrends = query({
  args: {
    metric: v.string(),
    lookbackDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackDays || 30) * 24 * 60 * 60 * 1000
    const startTime = Date.now() - lookbackMs

    const metrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_created_at')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .order('asc')
      .collect()

    if (metrics.length < 2) {
      return {
        trend: 'insufficient_data',
        changePercent: 0,
        confidence: 0,
        recommendation: 'Need more data points for trend analysis',
      }
    }

    // Extract metric values
    const values = metrics.map(m => {
      const qualityData = (m as any).qualityTrendData
      switch (args.metric) {
        case 'overall_score':
          return qualityData?.overallScore || m.overallApprovalRate * 100
        case 'display_rate':
          return qualityData?.displayRate || 90
        case 'human_review_rate':
          return qualityData?.humanReviewRate || 15
        case 'retry_rate':
          return qualityData?.retryRate || 12
        default:
          return 0
      }
    })

    // Calculate trend
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100
    const trend =
      changePercent > 2
        ? 'improving'
        : changePercent < -2
          ? 'degrading'
          : 'stable'

    // Calculate confidence based on data points and variance
    const variance =
      values.reduce(
        (sum, val) =>
          sum +
          Math.pow(val - values.reduce((s, v) => s + v, 0) / values.length, 2),
        0
      ) / values.length
    const confidence = Math.max(0, Math.min(100, 100 - variance / 10))

    let recommendation = 'Monitor trend continues'
    if (trend === 'degrading') {
      recommendation =
        'Investigate causes of degradation and implement corrective measures'
    } else if (trend === 'improving') {
      recommendation =
        'Analyze factors contributing to improvement for replication'
    }

    return {
      trend,
      changePercent: Math.round(changePercent * 100) / 100,
      confidence: Math.round(confidence),
      recommendation,
      dataPoints: values.length,
      currentValue: values[values.length - 1],
      previousValue: values[0],
    }
  },
})

/**
 * Mark quality alert as resolved
 */
export const resolveQualityAlert = mutation({
  args: {
    alertId: v.string(),
    resolvedBy: v.string(),
    resolution: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would update an alerts table
    // For now, just log the resolution
    console.log(
      `Quality alert ${args.alertId} resolved by ${args.resolvedBy}: ${args.resolution}`
    )

    return { success: true }
  },
})

/**
 * Internal function to check for quality alerts
 */
async function checkQualityAlerts(ctx: any, metrics: any): Promise<void> {
  // Check for sudden drops in quality
  const recentMetrics = await ctx.db
    .query('learningMetrics')
    .withIndex('by_created_at')
    .order('desc')
    .take(3)

  if (recentMetrics.length >= 2) {
    const current =
      (recentMetrics[0] as any).qualityTrendData?.overallScore || 75
    const previous =
      (recentMetrics[1] as any).qualityTrendData?.overallScore || 75

    // Alert for sudden quality drop
    if (current < previous - 10) {
      console.log(`Quality alert: Sudden drop from ${previous} to ${current}`)
      // In production, would create alert record
    }

    // Alert for sustained low quality
    const allLow = recentMetrics.every(
      m =>
        ((m as any).qualityTrendData?.overallScore || 75) <
        QUALITY_THRESHOLDS.overallScore.medium
    )

    if (allLow) {
      console.log('Quality alert: Sustained low quality detected')
      // In production, would create alert record
    }
  }

  // Check individual dimension degradation
  if (metrics.dimensionScores) {
    Object.entries(metrics.dimensionScores).forEach(([dimension, score]) => {
      if (typeof score === 'number' && score < 60) {
        console.log(`Quality alert: ${dimension} dimension score low: ${score}`)
        // In production, would create alert record
      }
    })
  }

  // Check for high failure rates
  if (metrics.displayRate < QUALITY_THRESHOLDS.displayRate.critical) {
    console.log(`Quality alert: Critical display rate: ${metrics.displayRate}%`)
    // In production, would create alert record
  }
}

/**
 * Generate quality recommendations based on trends
 */
export const getQualityRecommendations = query({
  args: {},
  handler: async ctx => {
    const alerts = await getQualityAlerts(ctx, { resolved: false })
    const recommendations: string[] = []

    // Analyze active alerts to generate recommendations
    const activeAlerts = alerts.filter(alert => !alert.resolved)

    if (activeAlerts.some(alert => alert.type === 'quality_drop')) {
      recommendations.push(
        'Review and update analysis prompts to improve quality'
      )
      recommendations.push(
        'Increase quality thresholds temporarily to block low-quality outputs'
      )
      recommendations.push('Enable human review for borderline cases')
    }

    if (activeAlerts.some(alert => alert.type === 'high_failure_rate')) {
      recommendations.push(
        'Investigate common failure patterns in rejected analyses'
      )
      recommendations.push(
        'Implement additional retry strategies for failed validations'
      )
      recommendations.push('Review input validation rules for edge cases')
    }

    if (activeAlerts.some(alert => alert.metric === 'human_review_rate')) {
      recommendations.push(
        'Analyze human review patterns to identify automation opportunities'
      )
      recommendations.push(
        'Improve automated quality detection to reduce false positives'
      )
      recommendations.push('Expand reviewer team or adjust review thresholds')
    }

    if (recommendations.length === 0) {
      recommendations.push('Quality metrics are within acceptable ranges')
      recommendations.push(
        'Continue monitoring trends for early detection of issues'
      )
    }

    return {
      recommendations,
      alertCount: activeAlerts.length,
      priorityActions: activeAlerts
        .filter(
          alert => alert.severity === 'critical' || alert.severity === 'high'
        )
        .map(alert => ({
          title: alert.title,
          description: alert.description,
          metric: alert.metric,
          action: 'immediate_attention_required',
        })),
    }
  },
})

/**
 * Export quality metrics for external analysis
 */
export const exportQualityData = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    format: v.optional(v.union(v.literal('json'), v.literal('csv'))),
  },
  handler: async (ctx, args) => {
    const startTime = new Date(args.startDate).getTime()
    const endTime = new Date(args.endDate).getTime()

    const metrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_created_at')
      .filter(q =>
        q.and(
          q.gte(q.field('createdAt'), startTime),
          q.lte(q.field('createdAt'), endTime)
        )
      )
      .order('asc')
      .collect()

    const exportData = metrics.map(metric => ({
      date: metric.date,
      timestamp: metric.createdAt,
      overallScore:
        (metric as any).qualityTrendData?.overallScore ||
        metric.overallApprovalRate * 100,
      displayRate: (metric as any).qualityTrendData?.displayRate || 90,
      humanReviewRate: (metric as any).qualityTrendData?.humanReviewRate || 15,
      retryRate: (metric as any).qualityTrendData?.retryRate || 12,
      analysisCount: (metric as any).qualityTrendData?.analysisCount || 0,
      dimensionScores: (metric as any).qualityTrendData?.dimensionScores || {},
    }))

    return {
      data: exportData,
      format: args.format || 'json',
      generatedAt: Date.now(),
      recordCount: exportData.length,
    }
  },
})
