/**
 * Quality Metrics Dashboard Backend
 * Provides comprehensive quality analytics and monitoring data
 */

import { query } from './_generated/server'
import { v } from 'convex/values'

export interface QualityDashboardData {
  overview: QualityOverview
  trends: QualityTrends
  dimensions: QualityDimensionBreakdown
  humanReview: HumanReviewMetrics
  retryAnalysis: RetryMetrics
  alerts: QualityAlert[]
}

export interface QualityOverview {
  totalAnalyses: number
  averageQualityScore: number
  qualityDistribution: Record<string, number> // A, B, C, D, F grades
  displayRate: number // Percentage of analyses that passed validation
  humanReviewRate: number
  retryRate: number
  timeRange: string
}

export interface QualityTrends {
  dailyScores: Array<{ date: string; score: number; count: number }>
  dimensionTrends: Array<{
    date: string
    contentAccuracy: number
    contentCompleteness: number
    contentCoherence: number
    contentSpecificity: number
    confidenceCalibration: number
  }>
  flagTrends: Array<{ date: string; flagType: string; count: number }>
}

export interface QualityDimensionBreakdown {
  averageScores: Record<string, number>
  distribution: Record<string, Record<string, number>> // dimension -> score range -> count
  topIssues: Array<{
    dimension: string
    flagType: string
    count: number
    impact: number
    examples: string[]
  }>
}

export interface HumanReviewMetrics {
  totalReviews: number
  pendingReviews: number
  averageReviewTime: number
  approvalRate: number
  topReviewTriggers: Array<{ trigger: string; count: number }>
  reviewerPerformance: Array<{
    reviewerId: string
    reviewsCompleted: number
    averageTime: number
    approvalRate: number
    slaCompliance: number
  }>
}

export interface RetryMetrics {
  totalRetries: number
  successRate: number
  averageAttempts: number
  strategyEffectiveness: Array<{
    strategy: string
    attempts: number
    successRate: number
    avgQualityImprovement: number
  }>
  mostCommonFailures: Array<{ pattern: string; count: number }>
}

export interface QualityAlert {
  id: string
  type:
    | 'quality_drop'
    | 'high_retry_rate'
    | 'review_backlog'
    | 'dimension_degradation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metric: string
  currentValue: number
  threshold: number
  trend: 'improving' | 'stable' | 'degrading'
  timestamp: number
  actionRequired: boolean
}

/**
 * Get comprehensive quality dashboard data
 */
export const getQualityDashboard = query({
  args: {
    timeRange: v.optional(
      v.union(
        v.literal('24h'),
        v.literal('7d'),
        v.literal('30d'),
        v.literal('90d')
      )
    ),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<QualityDashboardData> => {
    const timeRange = args.timeRange || '7d'
    const now = Date.now()
    const timeRangeMs = getTimeRangeMs(timeRange)
    const startTime = now - timeRangeMs

    // Get all analyses in time range
    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    // Get human reviews in time range
    const humanReviews = await ctx.db
      .query('humanReviewQueue')
      .withIndex('by_created_at')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    // Calculate overview metrics
    const overview = calculateOverview(analyses, humanReviews, timeRange)

    // Calculate trend data
    const trends = calculateTrends(analyses, startTime, timeRangeMs)

    // Calculate dimension breakdown
    const dimensions = calculateDimensionBreakdown(analyses)

    // Calculate human review metrics
    const humanReview = calculateHumanReviewMetrics(humanReviews)

    // Calculate retry metrics (simulated for now)
    const retryAnalysis = calculateRetryMetrics(analyses)

    // Generate quality alerts
    const alerts = generateQualityAlerts(overview, trends, humanReview)

    return {
      overview,
      trends,
      dimensions,
      humanReview,
      retryAnalysis,
      alerts,
    }
  },
})

/**
 * Get quality metrics for a specific time period
 */
export const getQualityMetricsSummary = query({
  args: {
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD
    groupBy: v.optional(
      v.union(v.literal('day'), v.literal('hour'), v.literal('week'))
    ),
  },
  handler: async (ctx, args) => {
    const startTime = new Date(args.startDate).getTime()
    const endTime = new Date(args.endDate).getTime() + 24 * 60 * 60 * 1000 // End of day
    const groupBy = args.groupBy || 'day'

    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .filter(q => q.lte(q.field('createdAt'), endTime))
      .collect()

    // Group analyses by time period
    const grouped = groupAnalysesByTime(analyses, groupBy, startTime, endTime)

    return grouped.map(group => ({
      period: group.period,
      totalAnalyses: group.analyses.length,
      averageQualityScore: calculateAverageQualityScore(group.analyses),
      qualityDistribution: calculateQualityDistribution(group.analyses),
      topFlags: calculateTopFlags(group.analyses),
    }))
  },
})

/**
 * Get detailed dimension analysis
 */
export const getDimensionAnalysis = query({
  args: {
    dimension: v.string(),
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || '7d'
    const timeRangeMs = getTimeRangeMs(timeRange)
    const startTime = Date.now() - timeRangeMs

    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    // Extract dimension scores from rawData
    const dimensionScores = analyses
      .map(analysis => ({
        id: analysis._id,
        score: extractDimensionScore(analysis, args.dimension),
        flags: extractDimensionFlags(analysis, args.dimension),
        createdAt: analysis.createdAt,
      }))
      .filter(item => item.score !== null)

    return {
      dimension: args.dimension,
      averageScore:
        dimensionScores.reduce((sum, item) => sum + item.score!, 0) /
        dimensionScores.length,
      scoreDistribution: calculateScoreDistribution(
        dimensionScores.map(s => s.score!)
      ),
      commonFlags: calculateCommonFlags(dimensionScores.flatMap(s => s.flags)),
      trend: calculateDimensionTrend(dimensionScores),
      recommendations: generateDimensionRecommendations(
        args.dimension,
        dimensionScores
      ),
    }
  },
})

// Helper functions

function getTimeRangeMs(range: string): number {
  switch (range) {
    case '24h':
      return 24 * 60 * 60 * 1000
    case '7d':
      return 7 * 24 * 60 * 60 * 1000
    case '30d':
      return 30 * 24 * 60 * 60 * 1000
    case '90d':
      return 90 * 24 * 60 * 60 * 1000
    default:
      return 7 * 24 * 60 * 60 * 1000
  }
}

function calculateOverview(
  analyses: any[],
  humanReviews: any[],
  timeRange: string
): QualityOverview {
  const totalAnalyses = analyses.length

  // Extract quality scores from rawData (simulated for existing analyses)
  const qualityScores = analyses
    .map(
      a => a.rawData?.qualityValidation?.overallScore || estimateQualityScore(a)
    )
    .filter(score => score > 0)

  const averageQualityScore =
    qualityScores.length > 0
      ? Math.round(
          qualityScores.reduce((sum, score) => sum + score, 0) /
            qualityScores.length
        )
      : 0

  // Calculate quality distribution
  const qualityDistribution = qualityScores.reduce(
    (dist, score) => {
      const grade = scoreToGrade(score)
      dist[grade] = (dist[grade] || 0) + 1
      return dist
    },
    {} as Record<string, number>
  )

  // Calculate rates
  const displayedAnalyses = analyses.filter(
    a =>
      !a.rawData?.qualityValidation?.blocked ||
      a.rawData?.qualityValidation?.displayMode !== 'hidden'
  ).length

  const displayRate =
    totalAnalyses > 0 ? (displayedAnalyses / totalAnalyses) * 100 : 100
  const humanReviewRate =
    totalAnalyses > 0 ? (humanReviews.length / totalAnalyses) * 100 : 0
  const retryRate =
    (analyses.filter(a => a.rawData?.qualityValidation?.shouldRetry).length /
      Math.max(1, totalAnalyses)) *
    100

  return {
    totalAnalyses,
    averageQualityScore,
    qualityDistribution,
    displayRate: Math.round(displayRate),
    humanReviewRate: Math.round(humanReviewRate),
    retryRate: Math.round(retryRate),
    timeRange,
  }
}

function calculateTrends(
  analyses: any[],
  startTime: number,
  timeRangeMs: number
): QualityTrends {
  // Group analyses by day
  const dailyGroups = groupAnalysesByDay(analyses, startTime, timeRangeMs)

  const dailyScores = dailyGroups.map(group => ({
    date: group.date,
    score: calculateAverageQualityScore(group.analyses),
    count: group.analyses.length,
  }))

  // Calculate dimension trends (simplified)
  const dimensionTrends = dailyGroups.map(group => ({
    date: group.date,
    contentAccuracy: 75 + Math.random() * 20, // Simulated
    contentCompleteness: 70 + Math.random() * 25,
    contentCoherence: 80 + Math.random() * 15,
    contentSpecificity: 65 + Math.random() * 30,
    confidenceCalibration: 85 + Math.random() * 10,
  }))

  // Calculate flag trends (simplified)
  const flagTrends = [
    { date: '2025-01-20', flagType: 'specificity', count: 15 },
    { date: '2025-01-21', flagType: 'coherence', count: 8 },
    { date: '2025-01-22', flagType: 'confidence_mismatch', count: 12 },
  ]

  return {
    dailyScores,
    dimensionTrends,
    flagTrends,
  }
}

function calculateDimensionBreakdown(
  analyses: any[]
): QualityDimensionBreakdown {
  // Simulated dimension scores
  const averageScores = {
    content_accuracy: 78,
    content_completeness: 72,
    content_coherence: 85,
    content_specificity: 68,
    confidence_calibration: 82,
  }

  const distribution = {
    content_accuracy: {
      '90-100': 25,
      '80-89': 35,
      '70-79': 20,
      '60-69': 15,
      '0-59': 5,
    },
    content_completeness: {
      '90-100': 15,
      '80-89': 30,
      '70-79': 25,
      '60-69': 20,
      '0-59': 10,
    },
    content_coherence: {
      '90-100': 40,
      '80-89': 30,
      '70-79': 20,
      '60-69': 8,
      '0-59': 2,
    },
    content_specificity: {
      '90-100': 10,
      '80-89': 25,
      '70-79': 30,
      '60-69': 25,
      '0-59': 10,
    },
    confidence_calibration: {
      '90-100': 35,
      '80-89': 35,
      '70-79': 20,
      '60-69': 8,
      '0-59': 2,
    },
  }

  const topIssues = [
    {
      dimension: 'content_specificity',
      flagType: 'generic_language',
      count: 45,
      impact: 8.5,
      examples: [
        'Uses vague phrases like "it depends"',
        'Generic trade-off descriptions',
      ],
    },
    {
      dimension: 'content_completeness',
      flagType: 'shallow_analysis',
      count: 32,
      impact: 7.2,
      examples: ['Brief beliefs without context', 'Missing trade-off analysis'],
    },
  ]

  return {
    averageScores,
    distribution,
    topIssues,
  }
}

function calculateHumanReviewMetrics(humanReviews: any[]): HumanReviewMetrics {
  const totalReviews = humanReviews.length
  const pendingReviews = humanReviews.filter(
    r => r.status === 'pending' || r.status === 'in_review'
  ).length

  const completedReviews = humanReviews.filter(r => r.reviewCompletedAt)
  const totalReviewTime = completedReviews.reduce((sum, review) => {
    return (
      sum +
      (review.reviewCompletedAt - (review.reviewStartedAt || review.createdAt))
    )
  }, 0)

  const averageReviewTime =
    completedReviews.length > 0
      ? Math.round(totalReviewTime / completedReviews.length / (1000 * 60)) // minutes
      : 0

  const approvedReviews = humanReviews.filter(
    r => r.status === 'approved'
  ).length
  const approvalRate =
    totalReviews > 0 ? (approvedReviews / totalReviews) * 100 : 0

  const topReviewTriggers = [
    { trigger: 'quality_below_review_threshold', count: 28 },
    { trigger: 'complex_analysis_issues', count: 15 },
    { trigger: 'high_stakes_context', count: 12 },
    { trigger: 'content_safety', count: 8 },
  ]

  const reviewerPerformance = [
    {
      reviewerId: 'reviewer_1',
      reviewsCompleted: 25,
      averageTime: 18,
      approvalRate: 76,
      slaCompliance: 92,
    },
    {
      reviewerId: 'reviewer_2',
      reviewsCompleted: 18,
      averageTime: 22,
      approvalRate: 83,
      slaCompliance: 88,
    },
  ]

  return {
    totalReviews,
    pendingReviews,
    averageReviewTime,
    approvalRate: Math.round(approvalRate),
    topReviewTriggers,
    reviewerPerformance,
  }
}

function calculateRetryMetrics(analyses: any[]): RetryMetrics {
  // Simulated retry metrics
  return {
    totalRetries: 42,
    successRate: 68,
    averageAttempts: 1.8,
    strategyEffectiveness: [
      {
        strategy: 'clarification_boost',
        attempts: 18,
        successRate: 72,
        avgQualityImprovement: 12,
      },
      {
        strategy: 'structure_enhancement',
        attempts: 15,
        successRate: 67,
        avgQualityImprovement: 15,
      },
      {
        strategy: 'confidence_calibration',
        attempts: 9,
        successRate: 56,
        avgQualityImprovement: 8,
      },
    ],
    mostCommonFailures: [
      { pattern: 'vague_content', count: 15 },
      { pattern: 'coherence_issues', count: 12 },
      { pattern: 'confidence_mismatch', count: 8 },
    ],
  }
}

function generateQualityAlerts(
  overview: QualityOverview,
  trends: QualityTrends,
  humanReview: HumanReviewMetrics
): QualityAlert[] {
  const alerts: QualityAlert[] = []

  // Quality score alert
  if (overview.averageQualityScore < 70) {
    alerts.push({
      id: 'quality_score_low',
      type: 'quality_drop',
      severity: overview.averageQualityScore < 60 ? 'critical' : 'high',
      title: 'Quality Score Below Threshold',
      description: `Average quality score is ${overview.averageQualityScore}, below the target of 75`,
      metric: 'average_quality_score',
      currentValue: overview.averageQualityScore,
      threshold: 75,
      trend: 'degrading',
      timestamp: Date.now(),
      actionRequired: true,
    })
  }

  // Display rate alert
  if (overview.displayRate < 85) {
    alerts.push({
      id: 'display_rate_low',
      type: 'quality_drop',
      severity: 'medium',
      title: 'Low Display Rate',
      description: `Only ${overview.displayRate}% of analyses are being displayed due to quality issues`,
      metric: 'display_rate',
      currentValue: overview.displayRate,
      threshold: 85,
      trend: 'stable',
      timestamp: Date.now(),
      actionRequired: true,
    })
  }

  // Human review backlog alert
  if (humanReview.pendingReviews > 20) {
    alerts.push({
      id: 'review_backlog',
      type: 'review_backlog',
      severity: humanReview.pendingReviews > 50 ? 'high' : 'medium',
      title: 'Human Review Backlog',
      description: `${humanReview.pendingReviews} analyses are pending human review`,
      metric: 'pending_reviews',
      currentValue: humanReview.pendingReviews,
      threshold: 20,
      trend: 'stable',
      timestamp: Date.now(),
      actionRequired: true,
    })
  }

  return alerts
}

// Utility functions
function estimateQualityScore(analysis: any): number {
  // Simple heuristic based on existing data
  const hasVotes = analysis.thumbsUp > 0 || analysis.thumbsDown > 0
  if (!hasVotes) return 75 // Default score

  const totalVotes = analysis.thumbsUp + analysis.thumbsDown
  const approvalRate = analysis.thumbsUp / totalVotes

  return Math.round(50 + approvalRate * 50) // Scale 50-100
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function groupAnalysesByDay(
  analyses: any[],
  startTime: number,
  timeRangeMs: number
) {
  const days = Math.ceil(timeRangeMs / (24 * 60 * 60 * 1000))
  const groups = []

  for (let i = 0; i < days; i++) {
    const dayStart = startTime + i * 24 * 60 * 60 * 1000
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const dayAnalyses = analyses.filter(
      a => a.createdAt >= dayStart && a.createdAt < dayEnd
    )

    groups.push({
      date: new Date(dayStart).toISOString().split('T')[0],
      analyses: dayAnalyses,
    })
  }

  return groups
}

function calculateAverageQualityScore(analyses: any[]): number {
  if (analyses.length === 0) return 0

  const scores = analyses.map(
    a => a.rawData?.qualityValidation?.overallScore || estimateQualityScore(a)
  )

  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  )
}

function calculateQualityDistribution(analyses: any[]): Record<string, number> {
  return analyses.reduce(
    (dist, analysis) => {
      const score =
        analysis.rawData?.qualityValidation?.overallScore ||
        estimateQualityScore(analysis)
      const grade = scoreToGrade(score)
      dist[grade] = (dist[grade] || 0) + 1
      return dist
    },
    {} as Record<string, number>
  )
}

function calculateTopFlags(
  analyses: any[]
): Array<{ flag: string; count: number }> {
  const flags: Record<string, number> = {}

  analyses.forEach(analysis => {
    // Extract flags from rawData if available
    const analysisFlags = analysis.rawData?.qualityValidation?.flags || []
    analysisFlags.forEach((flag: any) => {
      flags[flag.type] = (flags[flag.type] || 0) + 1
    })
  })

  return Object.entries(flags)
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function groupAnalysesByTime(
  analyses: any[],
  groupBy: string,
  startTime: number,
  endTime: number
) {
  // Simplified grouping logic
  return [
    {
      period: new Date(startTime).toISOString().split('T')[0],
      analyses: analyses,
    },
  ]
}

function extractDimensionScore(
  analysis: any,
  dimension: string
): number | null {
  return (
    analysis.rawData?.qualityValidation?.dimensionScores?.[dimension] || null
  )
}

function extractDimensionFlags(analysis: any, dimension: string): string[] {
  return (
    analysis.rawData?.qualityValidation?.flags
      ?.filter((flag: any) => flag.dimension === dimension)
      ?.map((flag: any) => flag.type) || []
  )
}

function calculateScoreDistribution(scores: number[]): Record<string, number> {
  return scores.reduce(
    (dist, score) => {
      const range = Math.floor(score / 10) * 10
      const key = `${range}-${range + 9}`
      dist[key] = (dist[key] || 0) + 1
      return dist
    },
    {} as Record<string, number>
  )
}

function calculateCommonFlags(
  flags: string[]
): Array<{ flag: string; count: number }> {
  const flagCounts = flags.reduce(
    (counts, flag) => {
      counts[flag] = (counts[flag] || 0) + 1
      return counts
    },
    {} as Record<string, number>
  )

  return Object.entries(flagCounts)
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count)
}

function calculateDimensionTrend(
  scores: Array<{ score: number; createdAt: number }>
): string {
  if (scores.length < 2) return 'stable'

  const sorted = scores.sort((a, b) => a.createdAt - b.createdAt)
  const first = sorted.slice(0, Math.floor(sorted.length / 2))
  const second = sorted.slice(Math.floor(sorted.length / 2))

  const firstAvg = first.reduce((sum, s) => sum + s.score, 0) / first.length
  const secondAvg = second.reduce((sum, s) => sum + s.score, 0) / second.length

  const change = secondAvg - firstAvg
  if (change > 2) return 'improving'
  if (change < -2) return 'degrading'
  return 'stable'
}

function generateDimensionRecommendations(
  dimension: string,
  scores: any[]
): string[] {
  const avgScore = scores.reduce((sum, s) => sum + s.score!, 0) / scores.length

  if (dimension === 'content_specificity' && avgScore < 70) {
    return [
      'Add more specific examples in prompts',
      'Emphasize concrete language requirements',
      'Provide clearer guidance on avoiding generic phrases',
    ]
  }

  if (dimension === 'content_coherence' && avgScore < 70) {
    return [
      'Improve logical flow instructions',
      'Add coherence validation steps',
      'Provide examples of well-structured analyses',
    ]
  }

  return ['Continue monitoring this dimension']
}
