/**
 * Quality-Based User Experience Adjustments
 * Dynamically adjusts UI and UX based on analysis quality metrics
 */

import { query } from './_generated/server'
import { v } from 'convex/values'

export interface QualityUXSettings {
  displaySettings: {
    showWarningIndicators: boolean
    useQualityBasedStyling: boolean
    showConfidenceVisually: boolean
    hideAnalysesBelow: number // Quality score threshold
    greyOutAnalysesBelow: number
  }
  interactionSettings: {
    enableQualityTooltips: boolean
    showQualityBadges: boolean
    allowVotingOnLowQuality: boolean
    requireConfirmationForLowQuality: boolean
  }
  feedbackSettings: {
    promoteHighQualityAnalyses: boolean
    collectExtraFeedbackOnBorderline: boolean
    showQualityImprovementSuggestions: boolean
  }
  adaptiveSettings: {
    adjustDisplayThresholds: boolean
    personalizeBasedOnUserFeedback: boolean
    learningMode: 'conservative' | 'balanced' | 'aggressive'
  }
}

export interface AnalysisDisplayConfig {
  shouldDisplay: boolean
  displayMode:
    | 'normal'
    | 'warning'
    | 'confidence_adjusted'
    | 'quality_highlighted'
  styling: {
    opacity: number
    borderColor?: string
    backgroundColor?: string
    showQualityIndicator: boolean
    qualityBadge?: {
      text: string
      color: string
      variant: 'success' | 'warning' | 'error' | 'info'
    }
  }
  interactions: {
    allowVoting: boolean
    showTooltip: boolean
    tooltipContent?: string
    requireConfirmation: boolean
    confirmationMessage?: string
  }
  enhancements: {
    showConfidenceBar: boolean
    highlightHighQuality: boolean
    showImprovementSuggestions: boolean
    collectDetailedFeedback: boolean
  }
}

/**
 * Get quality-based UX settings for a user/team
 */
export const getQualityUXSettings = query({
  args: {
    userId: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<QualityUXSettings> => {
    // In a real implementation, this would load user/team preferences
    // For now, return adaptive defaults based on recent quality metrics

    const recentMetrics = await ctx.db
      .query('learningMetrics')
      .withIndex('by_created_at')
      .order('desc')
      .take(5)

    const avgQuality =
      recentMetrics.length > 0
        ? recentMetrics.reduce(
            (sum, m) => sum + m.overallApprovalRate * 100,
            0
          ) / recentMetrics.length
        : 75

    // Adjust settings based on recent quality performance
    const isHighQualitySystem = avgQuality > 80
    const isLowQualitySystem = avgQuality < 65

    return {
      displaySettings: {
        showWarningIndicators: !isHighQualitySystem,
        useQualityBasedStyling: true,
        showConfidenceVisually: !isHighQualitySystem,
        hideAnalysesBelow: isLowQualitySystem
          ? 65
          : isHighQualitySystem
            ? 50
            : 60,
        greyOutAnalysesBelow: isLowQualitySystem
          ? 75
          : isHighQualitySystem
            ? 60
            : 70,
      },
      interactionSettings: {
        enableQualityTooltips: !isHighQualitySystem,
        showQualityBadges: !isHighQualitySystem,
        allowVotingOnLowQuality: true,
        requireConfirmationForLowQuality: isLowQualitySystem,
      },
      feedbackSettings: {
        promoteHighQualityAnalyses: true,
        collectExtraFeedbackOnBorderline: !isHighQualitySystem,
        showQualityImprovementSuggestions: isLowQualitySystem,
      },
      adaptiveSettings: {
        adjustDisplayThresholds: true,
        personalizeBasedOnUserFeedback: true,
        learningMode: isHighQualitySystem
          ? 'conservative'
          : isLowQualitySystem
            ? 'aggressive'
            : 'balanced',
      },
    }
  },
})

/**
 * Get display configuration for a specific analysis
 */
export const getAnalysisDisplayConfig = query({
  args: {
    analysisId: v.id('analyses'),
    userId: v.string(),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AnalysisDisplayConfig> => {
    const analysis = await ctx.db.get(args.analysisId)
    if (!analysis) {
      throw new Error('Analysis not found')
    }

    const uxSettings = await getQualityUXSettings(ctx, {
      userId: args.userId,
      teamId: args.teamId,
    })

    // Extract quality metrics from analysis
    const qualityScore =
      analysis.rawData?.qualityValidation?.overallScore ||
      estimateQualityFromVotes(analysis)
    const qualityGrade = scoreToGrade(qualityScore)
    const confidence = analysis.confidenceLevel

    // Determine display configuration
    const config: AnalysisDisplayConfig = {
      shouldDisplay: true,
      displayMode: 'normal',
      styling: {
        opacity: 1,
        showQualityIndicator: false,
      },
      interactions: {
        allowVoting: true,
        showTooltip: false,
        requireConfirmation: false,
      },
      enhancements: {
        showConfidenceBar: false,
        highlightHighQuality: false,
        showImprovementSuggestions: false,
        collectDetailedFeedback: false,
      },
    }

    // Apply quality-based adjustments
    if (qualityScore < uxSettings.displaySettings.hideAnalysesBelow) {
      config.shouldDisplay = false
      return config
    }

    // Grey out low quality analyses
    if (qualityScore < uxSettings.displaySettings.greyOutAnalysesBelow) {
      config.styling.opacity = 0.6
      config.displayMode = 'warning'

      if (uxSettings.displaySettings.showWarningIndicators) {
        config.styling.borderColor = '#f59e0b'
        config.styling.qualityBadge = {
          text: 'Low Quality',
          color: '#f59e0b',
          variant: 'warning',
        }
      }
    }

    // Highlight high quality analyses
    if (
      qualityScore > 85 &&
      uxSettings.feedbackSettings.promoteHighQualityAnalyses
    ) {
      config.enhancements.highlightHighQuality = true
      config.styling.qualityBadge = {
        text: 'High Quality',
        color: '#22c55e',
        variant: 'success',
      }
    }

    // Show confidence indicators for low confidence
    if (confidence < 70 && uxSettings.displaySettings.showConfidenceVisually) {
      config.enhancements.showConfidenceBar = true
      config.displayMode = 'confidence_adjusted'
    }

    // Quality tooltips
    if (uxSettings.interactionSettings.enableQualityTooltips) {
      config.interactions.showTooltip = true
      config.interactions.tooltipContent = generateQualityTooltip(
        qualityScore,
        qualityGrade,
        confidence
      )
    }

    // Require confirmation for low quality interactions
    if (
      qualityScore < 60 &&
      uxSettings.interactionSettings.requireConfirmationForLowQuality
    ) {
      config.interactions.requireConfirmation = true
      config.interactions.confirmationMessage =
        'This analysis has lower quality. Are you sure you want to interact with it?'
    }

    // Collect extra feedback on borderline cases
    if (
      qualityScore >= 60 &&
      qualityScore <= 75 &&
      uxSettings.feedbackSettings.collectExtraFeedbackOnBorderline
    ) {
      config.enhancements.collectDetailedFeedback = true
    }

    // Show improvement suggestions for low quality
    if (
      qualityScore < 70 &&
      uxSettings.feedbackSettings.showQualityImprovementSuggestions
    ) {
      config.enhancements.showImprovementSuggestions = true
    }

    // Voting restrictions
    if (
      qualityScore < 50 &&
      !uxSettings.interactionSettings.allowVotingOnLowQuality
    ) {
      config.interactions.allowVoting = false
    }

    return config
  },
})

/**
 * Get adaptive display thresholds based on recent performance
 */
export const getAdaptiveThresholds = query({
  args: {
    teamId: v.optional(v.string()),
    lookbackDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackDays || 7) * 24 * 60 * 60 * 1000
    const startTime = Date.now() - lookbackMs

    // Get recent analyses
    const recentAnalyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    if (recentAnalyses.length === 0) {
      return {
        hideThreshold: 60,
        greyoutThreshold: 70,
        warningThreshold: 75,
        confidenceAdjustment: 0,
        reasoning: 'No recent data, using defaults',
      }
    }

    // Calculate quality distribution
    const qualityScores = recentAnalyses.map(
      a =>
        a.rawData?.qualityValidation?.overallScore ||
        estimateQualityFromVotes(a)
    )

    const avgQuality =
      qualityScores.reduce((sum, score) => sum + score, 0) /
      qualityScores.length
    const sortedScores = qualityScores.sort((a, b) => a - b)
    const p25 = sortedScores[Math.floor(sortedScores.length * 0.25)]
    const p50 = sortedScores[Math.floor(sortedScores.length * 0.5)]
    const p75 = sortedScores[Math.floor(sortedScores.length * 0.75)]

    // Adaptive threshold calculation
    let hideThreshold = Math.max(40, p25 - 10) // Hide bottom 25% minus buffer
    let greyoutThreshold = Math.max(50, p50 - 5) // Grey out below median minus buffer
    let warningThreshold = Math.max(60, p75 - 5) // Warning below 75th percentile minus buffer

    // Apply system performance adjustments
    if (avgQuality > 80) {
      // High-performing system: can be more selective
      hideThreshold = Math.max(hideThreshold, 55)
      greyoutThreshold = Math.max(greyoutThreshold, 65)
      warningThreshold = Math.max(warningThreshold, 75)
    } else if (avgQuality < 65) {
      // Low-performing system: be more lenient to show more content
      hideThreshold = Math.min(hideThreshold, 45)
      greyoutThreshold = Math.min(greyoutThreshold, 55)
      warningThreshold = Math.min(warningThreshold, 65)
    }

    // Calculate confidence adjustment based on quality variance
    const variance =
      qualityScores.reduce(
        (sum, score) => sum + Math.pow(score - avgQuality, 2),
        0
      ) / qualityScores.length
    const confidenceAdjustment = variance > 400 ? -10 : variance < 100 ? 5 : 0

    return {
      hideThreshold: Math.round(hideThreshold),
      greyoutThreshold: Math.round(greyoutThreshold),
      warningThreshold: Math.round(warningThreshold),
      confidenceAdjustment,
      reasoning: `Based on ${recentAnalyses.length} analyses, avg quality: ${Math.round(avgQuality)}`,
      statistics: {
        averageQuality: Math.round(avgQuality),
        qualityVariance: Math.round(variance),
        sampleSize: recentAnalyses.length,
        percentiles: {
          p25: Math.round(p25),
          p50: Math.round(p50),
          p75: Math.round(p75),
        },
      },
    }
  },
})

/**
 * Get personalized quality settings based on user behavior
 */
export const getPersonalizedQualitySettings = query({
  args: {
    userId: v.string(),
    lookbackDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackMs = (args.lookbackDays || 30) * 24 * 60 * 60 * 1000
    const startTime = Date.now() - lookbackMs

    // Get user's voting history
    const userAnalyses = await ctx.db
      .query('analyses')
      .withIndex('by_created_at')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    // Filter analyses the user has voted on
    const userVotes = userAnalyses
      .filter(analysis =>
        analysis.userVotes.some(vote => vote.userId === args.userId)
      )
      .map(analysis => {
        const userVote = analysis.userVotes.find(
          vote => vote.userId === args.userId
        )!
        const qualityScore =
          analysis.rawData?.qualityValidation?.overallScore ||
          estimateQualityFromVotes(analysis)

        return {
          qualityScore,
          voteType: userVote.voteType,
          confidence: analysis.confidenceLevel,
        }
      })

    if (userVotes.length < 5) {
      return {
        personalizationLevel: 'insufficient_data',
        settings: null,
        recommendation: 'Need more user interaction data for personalization',
      }
    }

    // Analyze user preferences
    const upvotes = userVotes.filter(v => v.voteType === 'up')
    const downvotes = userVotes.filter(v => v.voteType === 'down')

    const avgUpvoteQuality =
      upvotes.length > 0
        ? upvotes.reduce((sum, v) => sum + v.qualityScore, 0) / upvotes.length
        : 75

    const avgDownvoteQuality =
      downvotes.length > 0
        ? downvotes.reduce((sum, v) => sum + v.qualityScore, 0) /
          downvotes.length
        : 50

    // Determine user's quality tolerance
    const qualityTolerance =
      avgDownvoteQuality > 65
        ? 'high_standards'
        : avgUpvoteQuality < 70
          ? 'tolerant'
          : 'balanced'

    // Generate personalized settings
    const personalizedSettings = {
      hideThreshold:
        qualityTolerance === 'high_standards'
          ? 70
          : qualityTolerance === 'tolerant'
            ? 45
            : 60,
      greyoutThreshold:
        qualityTolerance === 'high_standards'
          ? 80
          : qualityTolerance === 'tolerant'
            ? 60
            : 70,
      showQualityIndicators: qualityTolerance === 'high_standards',
      collectExtraFeedback: qualityTolerance === 'balanced',
      confidenceWeighting: upvotes.some(v => v.confidence < 60)
        ? 'high'
        : 'normal',
    }

    return {
      personalizationLevel: 'customized',
      settings: personalizedSettings,
      userProfile: {
        qualityTolerance,
        avgPreferredQuality: Math.round(avgUpvoteQuality),
        avgRejectedQuality: Math.round(avgDownvoteQuality),
        votingPattern:
          upvotes.length > downvotes.length * 2
            ? 'generous'
            : downvotes.length > upvotes.length * 2
              ? 'critical'
              : 'balanced',
        totalVotes: userVotes.length,
      },
      recommendation: `Adjusted settings for ${qualityTolerance} quality preference`,
    }
  },
})

// Helper functions

function estimateQualityFromVotes(analysis: any): number {
  const totalVotes = analysis.thumbsUp + analysis.thumbsDown
  if (totalVotes === 0) return 75 // Default score

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

function generateQualityTooltip(
  qualityScore: number,
  qualityGrade: string,
  confidence: number
): string {
  let tooltip = `Quality: ${qualityScore}/100 (${qualityGrade})`

  if (qualityScore < 70) {
    tooltip += ' - This analysis may have quality issues'
  } else if (qualityScore > 85) {
    tooltip += ' - High quality analysis'
  }

  if (confidence < 70) {
    tooltip += ` | Confidence: ${confidence}% (Low)`
  } else if (confidence > 85) {
    tooltip += ` | Confidence: ${confidence}% (High)`
  }

  return tooltip
}

/**
 * Update user quality preferences based on feedback
 */
export const updateUserQualityPreferences = query({
  args: {
    userId: v.string(),
    feedbackType: v.union(
      v.literal('quality_threshold'),
      v.literal('display_preference'),
      v.literal('interaction_preference')
    ),
    preferences: v.any(),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would update user preference records
    console.log(
      `Updated quality preferences for user ${args.userId}:`,
      args.preferences
    )

    return {
      success: true,
      message: 'Quality preferences updated successfully',
      effectiveFrom: Date.now(),
    }
  },
})
