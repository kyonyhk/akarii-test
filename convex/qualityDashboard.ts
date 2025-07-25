/**
 * Quality Metrics Dashboard
 * Comprehensive analytics and monitoring for analysis quality
 */

import { query } from './_generated/server'
import { v } from 'convex/values'

export interface QualityMetricsOverview {
  totalAnalyses: number
  averageQualityScore: number
  qualityDistribution: Record<string, number> // A, B, C, D, F grades
  trendData: {
    date: string
    averageScore: number
    totalCount: number
  }[]
  topIssues: {
    type: string
    count: number
    percentage: number
  }[]
  humanReviewStats: {
    totalReviews: number
    pendingReviews: number
    approvalRate: number
    averageReviewTime: number
  }
}

export interface QualityDimensionMetrics {
  dimensionName: string
  averageScore: number
  distribution: number[]
  trendData: {
    date: string
    score: number
  }[]
  commonIssues: string[]
}

export interface UserQualityProfile {
  userId: string
  analysesCount: number
  averageQualityScore: number
  qualityGrade: string
  improvementTrend: number
  commonIssueTypes: string[]
}

/**
 * Get comprehensive quality metrics overview
 */
export const getQualityOverview = query({
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
  handler: async (ctx, args): Promise<QualityMetricsOverview> => {
    const timeRange = args.timeRange || '7d'
    const cutoffTime = getCutoffTime(timeRange)

    // Get analyses with quality validation data
    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', cutoffTime))
      .collect()

    // Filter analyses with quality data
    const qualityAnalyses = analyses.filter(
      analysis =>
        analysis.rawData?.qualityValidation?.overallScore !== undefined
    )

    const totalAnalyses = qualityAnalyses.length

    // Calculate average quality score
    const averageQualityScore =
      totalAnalyses > 0
        ? qualityAnalyses.reduce(
            (sum, analysis) =>
              sum + (analysis.rawData.qualityValidation.overallScore || 0),
            0
          ) / totalAnalyses
        : 0

    // Quality distribution by grade
    const qualityDistribution: Record<string, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    }
    qualityAnalyses.forEach(analysis => {
      const grade = analysis.rawData.qualityValidation?.qualityGrade || 'F'
      qualityDistribution[grade]++
    })

    // Trend data (daily aggregates)
    const trendData = generateTrendData(qualityAnalyses, timeRange)

    // Top quality issues
    const topIssues = analyzeQualityIssues(qualityAnalyses)

    // Human review statistics
    const humanReviewStats = await getHumanReviewStats(ctx, cutoffTime)

    return {
      totalAnalyses,
      averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      qualityDistribution,
      trendData,
      topIssues,
      humanReviewStats,
    }
  },
})

/**
 * Get detailed metrics for specific quality dimensions
 */
export const getQualityDimensionMetrics = query({
  args: {
    dimension: v.union(
      v.literal('content_accuracy'),
      v.literal('content_completeness'),
      v.literal('content_coherence'),
      v.literal('content_specificity'),
      v.literal('confidence_calibration')
    ),
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<QualityDimensionMetrics> => {
    const timeRange = args.timeRange || '7d'
    const cutoffTime = getCutoffTime(timeRange)

    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', cutoffTime))
      .collect()

    const dimensionScores = analyses
      .map(
        analysis =>
          analysis.rawData?.qualityValidation?.dimensionScores?.[args.dimension]
      )
      .filter(score => typeof score === 'number')

    const averageScore =
      dimensionScores.length > 0
        ? dimensionScores.reduce((sum, score) => sum + score, 0) /
          dimensionScores.length
        : 0

    // Create distribution buckets (0-20, 21-40, 41-60, 61-80, 81-100)
    const distribution = [0, 0, 0, 0, 0]
    dimensionScores.forEach(score => {
      const bucket = Math.min(Math.floor(score / 20), 4)
      distribution[bucket]++
    })

    // Generate trend data
    const trendData = generateDimensionTrendData(
      analyses,
      args.dimension,
      timeRange
    )

    // Extract common issues for this dimension
    const commonIssues = extractDimensionIssues(analyses, args.dimension)

    return {
      dimensionName: args.dimension,
      averageScore: Math.round(averageScore * 100) / 100,
      distribution,
      trendData,
      commonIssues,
    }
  },
})

/**
 * Get quality profiles for users
 */
export const getUserQualityProfiles = query({
  args: {
    limit: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal('qualityScore'),
        v.literal('analysesCount'),
        v.literal('improvement')
      )
    ),
  },
  handler: async (ctx, args): Promise<UserQualityProfile[]> => {
    const limit = args.limit || 50
    const sortBy = args.sortBy || 'qualityScore'

    // Get all analyses with user information
    const analyses = await ctx.db.query('analyses').collect()

    // Group by user
    const userProfiles: Record<
      string,
      {
        analyses: any[]
        qualityScores: number[]
      }
    > = {}

    analyses.forEach(analysis => {
      const userId = analysis.rawData?.userId || 'unknown'
      const qualityScore = analysis.rawData?.qualityValidation?.overallScore

      if (qualityScore !== undefined) {
        if (!userProfiles[userId]) {
          userProfiles[userId] = { analyses: [], qualityScores: [] }
        }
        userProfiles[userId].analyses.push(analysis)
        userProfiles[userId].qualityScores.push(qualityScore)
      }
    })

    // Generate profiles
    const profiles: UserQualityProfile[] = Object.entries(userProfiles)
      .map(([userId, data]) => {
        const averageQualityScore =
          data.qualityScores.reduce((sum, score) => sum + score, 0) /
          data.qualityScores.length
        const qualityGrade = scoreToGrade(averageQualityScore)

        // Calculate improvement trend (comparing first half to second half)
        const halfPoint = Math.floor(data.qualityScores.length / 2)
        const firstHalf = data.qualityScores.slice(0, halfPoint)
        const secondHalf = data.qualityScores.slice(halfPoint)

        const firstHalfAvg =
          firstHalf.length > 0
            ? firstHalf.reduce((sum, score) => sum + score, 0) /
              firstHalf.length
            : 0
        const secondHalfAvg =
          secondHalf.length > 0
            ? secondHalf.reduce((sum, score) => sum + score, 0) /
              secondHalf.length
            : 0
        const improvementTrend = secondHalfAvg - firstHalfAvg

        // Extract common issue types
        const commonIssueTypes = extractUserIssueTypes(data.analyses)

        return {
          userId,
          analysesCount: data.analyses.length,
          averageQualityScore: Math.round(averageQualityScore * 100) / 100,
          qualityGrade,
          improvementTrend: Math.round(improvementTrend * 100) / 100,
          commonIssueTypes,
        }
      })
      .filter(profile => profile.analysesCount >= 5) // Only include users with sufficient data

    // Sort profiles
    profiles.sort((a, b) => {
      switch (sortBy) {
        case 'qualityScore':
          return b.averageQualityScore - a.averageQualityScore
        case 'analysesCount':
          return b.analysesCount - a.analysesCount
        case 'improvement':
          return b.improvementTrend - a.improvementTrend
        default:
          return b.averageQualityScore - a.averageQualityScore
      }
    })

    return profiles.slice(0, limit)
  },
})

/**
 * Get quality comparison metrics between different prompt variants
 */
export const getPromptVariantComparison = query({
  args: {
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || '7d'
    const cutoffTime = getCutoffTime(timeRange)

    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', cutoffTime))
      .collect()

    // Group by prompt variant
    const variantMetrics: Record<
      string,
      {
        count: number
        qualityScores: number[]
        averageScore: number
        gradeDistribution: Record<string, number>
      }
    > = {}

    analyses.forEach(analysis => {
      const variant = analysis.rawData?.promptVariant || 'unknown'
      const qualityScore = analysis.rawData?.qualityValidation?.overallScore
      const grade = analysis.rawData?.qualityValidation?.qualityGrade

      if (qualityScore !== undefined) {
        if (!variantMetrics[variant]) {
          variantMetrics[variant] = {
            count: 0,
            qualityScores: [],
            averageScore: 0,
            gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
          }
        }

        variantMetrics[variant].count++
        variantMetrics[variant].qualityScores.push(qualityScore)
        if (grade) {
          variantMetrics[variant].gradeDistribution[grade]++
        }
      }
    })

    // Calculate averages
    Object.values(variantMetrics).forEach(metrics => {
      metrics.averageScore =
        metrics.qualityScores.length > 0
          ? metrics.qualityScores.reduce((sum, score) => sum + score, 0) /
            metrics.qualityScores.length
          : 0
    })

    return variantMetrics
  },
})

/**
 * Get real-time quality alerts and issues
 */
export const getQualityAlerts = query({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const last24h = now - 24 * 60 * 60 * 1000

    // Get recent analyses
    const recentAnalyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at', q => q.gte('createdAt', last24h))
      .collect()

    const alerts: {
      type:
        | 'quality_drop'
        | 'high_failure_rate'
        | 'review_backlog'
        | 'pattern_detected'
      severity: 'low' | 'medium' | 'high'
      title: string
      description: string
      count?: number
      timestamp: number
    }[] = []

    // Check for quality drops
    const qualityScores = recentAnalyses
      .map(a => a.rawData?.qualityValidation?.overallScore)
      .filter(score => typeof score === 'number')

    if (qualityScores.length > 10) {
      const averageScore =
        qualityScores.reduce((sum, score) => sum + score, 0) /
        qualityScores.length
      if (averageScore < 60) {
        alerts.push({
          type: 'quality_drop',
          severity: 'high',
          title: 'Quality Score Drop Detected',
          description: `Average quality score in last 24h: ${Math.round(averageScore)}`,
          timestamp: now,
        })
      }
    }

    // Check for high failure rate
    const failedAnalyses = recentAnalyses.filter(
      a => a.rawData?.qualityValidation?.blocked === true
    )
    const failureRate =
      recentAnalyses.length > 0
        ? failedAnalyses.length / recentAnalyses.length
        : 0

    if (failureRate > 0.2) {
      alerts.push({
        type: 'high_failure_rate',
        severity: 'medium',
        title: 'High Analysis Failure Rate',
        description: `${Math.round(failureRate * 100)}% of analyses failed quality validation`,
        count: failedAnalyses.length,
        timestamp: now,
      })
    }

    // Check review backlog
    const pendingReviews = await ctx.db
      .query('humanReviewQueue')
      .withIndex('by_status', q => q.eq('status', 'pending'))
      .collect()

    if (pendingReviews.length > 10) {
      alerts.push({
        type: 'review_backlog',
        severity: 'medium',
        title: 'Human Review Backlog',
        description: `${pendingReviews.length} analyses pending human review`,
        count: pendingReviews.length,
        timestamp: now,
      })
    }

    return alerts
  },
})

// Helper functions

function getCutoffTime(timeRange: string): number {
  const now = Date.now()
  const ranges: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  }
  return now - (ranges[timeRange] || ranges['7d'])
}

function generateTrendData(analyses: any[], timeRange: string) {
  const days = timeRange === '24h' ? 1 : parseInt(timeRange) || 7
  const trendData: {
    date: string
    averageScore: number
    totalCount: number
  }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]

    const dayAnalyses = analyses.filter(analysis => {
      const analysisDate = new Date(analysis.createdAt)
        .toISOString()
        .split('T')[0]
      return analysisDate === dateStr
    })

    const qualityScores = dayAnalyses
      .map(a => a.rawData?.qualityValidation?.overallScore)
      .filter(score => typeof score === 'number')

    const averageScore =
      qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score, 0) /
          qualityScores.length
        : 0

    trendData.push({
      date: dateStr,
      averageScore: Math.round(averageScore * 100) / 100,
      totalCount: dayAnalyses.length,
    })
  }

  return trendData
}

function analyzeQualityIssues(analyses: any[]) {
  const issueCount: Record<string, number> = {}
  let totalFlags = 0

  analyses.forEach(analysis => {
    const flags = analysis.rawData?.qualityValidation?.flags || []
    flags.forEach((flag: any) => {
      issueCount[flag.type] = (issueCount[flag.type] || 0) + 1
      totalFlags++
    })
  })

  return Object.entries(issueCount)
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / totalFlags) * 100) || 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

async function getHumanReviewStats(ctx: any, cutoffTime: number) {
  const reviews = await ctx.db
    .query('humanReviewQueue')
    .withIndex('by_created_at', q => q.gte('createdAt', cutoffTime))
    .collect()

  const totalReviews = reviews.length
  const pendingReviews = reviews.filter(r => r.status === 'pending').length
  const completedReviews = reviews.filter(r =>
    ['approved', 'rejected'].includes(r.status)
  )
  const approvalRate =
    completedReviews.length > 0
      ? completedReviews.filter(r => r.status === 'approved').length /
        completedReviews.length
      : 0

  // Calculate average review time
  const reviewTimes = completedReviews
    .filter(r => r.reviewStartedAt && r.reviewCompletedAt)
    .map(r => r.reviewCompletedAt! - r.reviewStartedAt!)

  const averageReviewTime =
    reviewTimes.length > 0
      ? reviewTimes.reduce((sum, time) => sum + time, 0) /
        reviewTimes.length /
        (1000 * 60)
      : 0 // in minutes

  return {
    totalReviews,
    pendingReviews,
    approvalRate: Math.round(approvalRate * 100) / 100,
    averageReviewTime: Math.round(averageReviewTime * 100) / 100,
  }
}

function generateDimensionTrendData(
  analyses: any[],
  dimension: string,
  timeRange: string
) {
  const days = timeRange === '24h' ? 1 : parseInt(timeRange) || 7
  const trendData: { date: string; score: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]

    const dayAnalyses = analyses.filter(analysis => {
      const analysisDate = new Date(analysis.createdAt)
        .toISOString()
        .split('T')[0]
      return analysisDate === dateStr
    })

    const dimensionScores = dayAnalyses
      .map(a => a.rawData?.qualityValidation?.dimensionScores?.[dimension])
      .filter(score => typeof score === 'number')

    const averageScore =
      dimensionScores.length > 0
        ? dimensionScores.reduce((sum, score) => sum + score, 0) /
          dimensionScores.length
        : 0

    trendData.push({
      date: dateStr,
      score: Math.round(averageScore * 100) / 100,
    })
  }

  return trendData
}

function extractDimensionIssues(analyses: any[], dimension: string): string[] {
  const issues: Record<string, number> = {}

  analyses.forEach(analysis => {
    const flags = analysis.rawData?.qualityValidation?.flags || []
    flags
      .filter(
        (flag: any) =>
          flag.type === dimension ||
          (dimension === 'content_accuracy' &&
            ['consistency', 'coherence'].includes(flag.type)) ||
          (dimension === 'content_completeness' &&
            flag.type === 'completeness') ||
          (dimension === 'content_specificity' && flag.type === 'specificity')
      )
      .forEach((flag: any) => {
        issues[flag.description] = (issues[flag.description] || 0) + 1
      })
  })

  return Object.entries(issues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue]) => issue)
}

function extractUserIssueTypes(analyses: any[]): string[] {
  const issueTypes: Record<string, number> = {}

  analyses.forEach(analysis => {
    const flags = analysis.rawData?.qualityValidation?.flags || []
    flags.forEach((flag: any) => {
      issueTypes[flag.type] = (issueTypes[flag.type] || 0) + 1
    })
  })

  return Object.entries(issueTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type)
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}
