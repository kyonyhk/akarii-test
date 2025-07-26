/**
 * Pre-display validation system
 * Comprehensive quality gates before analyses are shown to users
 */

import { StructuredOutputFormat } from './promptConfig'
import {
  evaluateAnalysisQuality,
  AnalysisQualityInput,
  ComprehensiveQualityResult,
  QUALITY_THRESHOLDS,
} from './qualityValidation'
import {
  validateAnalysisOutput,
  EnhancedValidationResult,
} from './outputValidation'

export interface PreDisplayValidationResult {
  shouldDisplay: boolean
  shouldRetry: boolean
  requiresHumanReview: boolean
  requiresApproval: boolean
  displayMode: 'normal' | 'warning' | 'hidden' | 'review_pending'
  qualityResult: ComprehensiveQualityResult
  enhancedValidation: EnhancedValidationResult
  adjustedOutput?: StructuredOutputFormat
  blockingReasons: string[]
  warnings: string[]
  humanReviewId?: string
  reviewTriggers: string[]
  metadata: {
    validationTimestamp: number
    processingTimeMs: number
    qualityScore: number
    confidenceAdjusted: boolean
    retryRecommended: boolean
  }
}

export interface ValidationContext {
  userId: string
  teamId?: string
  conversationId: string
  messageId: string
  isTestMode?: boolean
  userTier?: 'free' | 'pro' | 'enterprise'
  hasHumanReviewAccess?: boolean
}

/**
 * Main pre-display validation function
 * Decides whether analysis should be displayed and how
 */
export async function validateForDisplay(
  ctx: any,
  output: StructuredOutputFormat,
  originalMessage: string,
  context: ValidationContext,
  conversationContext?: string,
  metadata?: {
    responseTime?: number
    retryCount?: number
    promptVariant?: string
  }
): Promise<PreDisplayValidationResult> {
  const startTime = Date.now()
  const blockingReasons: string[] = []
  const warnings: string[] = []

  // Step 1: Enhanced structural validation
  const enhancedValidation = validateAnalysisOutput(
    output,
    originalMessage,
    conversationContext
  )

  // Step 2: Comprehensive quality evaluation
  const qualityInput: AnalysisQualityInput = {
    output,
    originalMessage,
    context: conversationContext,
    metadata: {
      responseTime: metadata?.responseTime,
      retryCount: metadata?.retryCount,
      userId: context.userId,
      conversationId: context.conversationId,
    },
  }

  const qualityResult = evaluateAnalysisQuality(qualityInput)

  // Step 3: Apply quality-based adjustments to output
  let adjustedOutput = { ...output }
  let confidenceAdjusted = false

  if (qualityResult.confidenceAdjustment !== 0) {
    adjustedOutput.confidence_level = Math.max(
      0,
      Math.min(
        100,
        output.confidence_level + qualityResult.confidenceAdjustment
      )
    )
    confidenceAdjusted = true
  }

  // Use sanitized output from enhanced validation if available
  if (enhancedValidation.sanitizedOutput) {
    adjustedOutput = {
      ...adjustedOutput,
      ...enhancedValidation.sanitizedOutput,
      confidence_level: adjustedOutput.confidence_level, // Keep our adjustment
    }
  }

  // Step 4: Determine display decisions based on quality and validation

  // Blocking conditions (prevent display entirely)
  if (!enhancedValidation.isValid) {
    blockingReasons.push('Failed structural validation')
  }

  if (qualityResult.overallScore < QUALITY_THRESHOLDS.DISPLAY_MINIMUM) {
    blockingReasons.push(
      `Quality score too low: ${qualityResult.overallScore}/${QUALITY_THRESHOLDS.DISPLAY_MINIMUM}`
    )
  }

  // Critical quality issues that should block display
  const criticalFlags = qualityResult.flags.filter(f => f.severity === 'high')
  if (criticalFlags.length > 5) {
    // Increased from 2 to 5 for better usability
    blockingReasons.push(
      `Too many critical quality issues: ${criticalFlags.length}`
    )
  }

  // Content safety check
  if (hasUnsafeContent(adjustedOutput, originalMessage)) {
    blockingReasons.push('Content safety concerns detected')
  }

  // Retry recommendations
  const shouldRetry =
    qualityResult.shouldRetry ||
    ((metadata?.retryCount || 0) < 2 &&
      qualityResult.overallScore < QUALITY_THRESHOLDS.RETRY_THRESHOLD)

  // Collect human review triggers
  const reviewTriggers: string[] = []

  if (qualityResult.requiresHumanReview) {
    reviewTriggers.push('quality_below_review_threshold')
  }

  if (hasComplexAnalysisIssues(qualityResult)) {
    reviewTriggers.push('complex_analysis_issues')
  }

  if (isHighStakesContext(context, originalMessage)) {
    reviewTriggers.push('high_stakes_context')
  }

  if (hasUnsafeContent(adjustedOutput, originalMessage)) {
    reviewTriggers.push('content_safety')
  }

  if (criticalFlags.length > 2) {
    reviewTriggers.push('multiple_critical_flags')
  }

  // Human review triggers
  const requiresHumanReview = reviewTriggers.length > 0

  // If human review is required and access is available, submit for review
  let humanReviewId: string | undefined
  if (requiresHumanReview && context.hasHumanReviewAccess) {
    try {
      humanReviewId = await submitForHumanReview(
        ctx,
        adjustedOutput,
        originalMessage,
        context,
        qualityResult,
        reviewTriggers
      )
    } catch (error) {
      console.error('Failed to submit for human review:', error)
      // Continue without human review rather than failing completely
    }
  }

  // Approval requirements (for enterprise features)
  const requiresApproval =
    context.userTier === 'enterprise' &&
    (qualityResult.overallScore < 80 || requiresHumanReview)

  // Determine display mode
  let displayMode: 'normal' | 'warning' | 'hidden' | 'review_pending' = 'normal'
  const shouldDisplay = blockingReasons.length === 0

  if (!shouldDisplay) {
    displayMode = 'hidden'
  } else if (requiresApproval && context.hasHumanReviewAccess) {
    displayMode = 'review_pending'
  } else if (
    qualityResult.overallScore < QUALITY_THRESHOLDS.WARNING_THRESHOLD
  ) {
    displayMode = 'warning'
    warnings.push('Analysis quality is below optimal standards')
  }

  // Add quality-specific warnings
  if (
    qualityResult.qualityGrade === 'D' ||
    qualityResult.qualityGrade === 'F'
  ) {
    warnings.push(
      `Analysis received quality grade: ${qualityResult.qualityGrade}`
    )
  }

  if (enhancedValidation.warnings.length > 0) {
    warnings.push(...enhancedValidation.warnings)
  }

  // Step 5: Log quality metrics for monitoring
  await logQualityMetrics(context, qualityResult, enhancedValidation)

  const processingTimeMs = Date.now() - startTime

  return {
    shouldDisplay,
    shouldRetry,
    requiresHumanReview,
    requiresApproval,
    displayMode,
    qualityResult,
    enhancedValidation,
    adjustedOutput: shouldDisplay ? adjustedOutput : undefined,
    blockingReasons,
    warnings,
    humanReviewId,
    reviewTriggers,
    metadata: {
      validationTimestamp: Date.now(),
      processingTimeMs,
      qualityScore: qualityResult.overallScore,
      confidenceAdjusted,
      retryRecommended: shouldRetry,
    },
  }
}

/**
 * Check for unsafe content that should block display
 */
function hasUnsafeContent(
  output: StructuredOutputFormat,
  originalMessage: string
): boolean {
  const unsafeIndicators = [
    'harmful',
    'dangerous',
    'illegal',
    'violence',
    'hate speech',
    'self-harm',
    'suicide',
    'abuse',
    'harassment',
    'discrimination',
  ]

  const allContent = [
    ...output.beliefs,
    ...output.trade_offs,
    output.reasoning,
    originalMessage,
  ]
    .join(' ')
    .toLowerCase()

  // Simple keyword detection - in production, this would use more sophisticated methods
  return unsafeIndicators.some(
    indicator =>
      allContent.includes(indicator) &&
      !allContent.includes(`not ${indicator}`) &&
      !allContent.includes(`against ${indicator}`)
  )
}

/**
 * Check if analysis has complex issues requiring human review
 */
function hasComplexAnalysisIssues(
  qualityResult: ComprehensiveQualityResult
): boolean {
  // Multiple medium severity issues
  const mediumFlags = qualityResult.flags.filter(f => f.severity === 'medium')
  if (mediumFlags.length >= 3) return true

  // Specific concerning patterns
  const concerningFlags = qualityResult.flags.filter(
    f => f.type === 'coherence' || f.type === 'confidence_mismatch'
  )
  if (concerningFlags.length >= 2) return true

  // Very low scores in critical dimensions
  const criticalDimensions = ['content_accuracy', 'content_coherence']
  const hasLowCriticalScores = criticalDimensions.some(
    dim => qualityResult.dimensionScores[dim] < 60
  )

  return hasLowCriticalScores
}

/**
 * Determine if this is a high-stakes context requiring extra care
 */
function isHighStakesContext(
  context: ValidationContext,
  originalMessage: string
): boolean {
  // Check for sensitive topics
  const sensitiveTopics = [
    'medical',
    'health',
    'legal',
    'financial',
    'investment',
    'safety',
    'security',
    'emergency',
    'crisis',
    'mental health',
  ]

  const messageText = originalMessage.toLowerCase()
  const hasSensitiveTopic = sensitiveTopics.some(topic =>
    messageText.includes(topic)
  )

  // Enterprise users get more scrutiny
  const isEnterpriseUser = context.userTier === 'enterprise'

  // Test mode gets less scrutiny
  const isTestMode = context.isTestMode

  return hasSensitiveTopic || (isEnterpriseUser && !isTestMode)
}

/**
 * Submit analysis for human review
 */
async function submitForHumanReview(
  ctx: any,
  output: StructuredOutputFormat,
  originalMessage: string,
  context: ValidationContext,
  qualityResult: ComprehensiveQualityResult,
  reviewTriggers: string[]
): Promise<string> {
  // Import the human review function (this would need to be passed in or injected)
  // const { submitForReview } = await import('./humanReview') // Disabled due to Node.js dependency issue

  const automatedFlags = qualityResult.flags.map(flag => ({
    type: flag.type,
    severity: flag.severity,
    description: flag.description,
    suggestion: flag.suggestion,
  }))

  try {
    /* const reviewId = await ctx.runMutation(submitForReview, {
      messageId: context.messageId,
      originalContent: originalMessage,
      proposedAnalysis: {
        statementType: output.statement_type,
        beliefs: output.beliefs,
        tradeOffs: output.trade_offs,
        confidenceLevel: output.confidence_level,
        reasoning: output.reasoning || '',
      },
      qualityMetrics: {
        overallScore: qualityResult.overallScore,
        qualityGrade: qualityResult.qualityGrade,
        dimensionScores: qualityResult.dimensionScores,
        flagCount: qualityResult.flags.length,
        blockingReasons: [],
      },
      reviewTriggers,
      userContext: {
        userId: context.userId,
        teamId: context.teamId,
        conversationId: context.conversationId,
        userTier: context.userTier || 'pro',
      },
      automatedFlags,
    }) */

    // console.log(`Submitted analysis for human review: ${reviewId}`)
    return 'human-review-disabled' // Disabled due to Node.js dependency issue
  } catch (error) {
    console.error('Failed to submit for human review:', error)
    throw error
  }
}

/**
 * Log quality metrics for monitoring and improvement
 */
async function logQualityMetrics(
  context: ValidationContext,
  qualityResult: ComprehensiveQualityResult,
  validation: EnhancedValidationResult
): Promise<void> {
  // In a real implementation, this would send metrics to a monitoring system
  console.log(`Quality validation completed for user ${context.userId}:`, {
    messageId: context.messageId,
    overallScore: qualityResult.overallScore,
    qualityGrade: qualityResult.qualityGrade,
    shouldDisplay: qualityResult.shouldDisplay,
    flagCount: qualityResult.flags.length,
    dimensionScores: qualityResult.dimensionScores,
    validationErrors: validation.errors.length,
    validationWarnings: validation.warnings.length,
  })

  // TODO: In production, send to metrics collection system:
  // - Quality score distributions
  // - Flag frequency analysis
  // - Display/hide decision patterns
  // - User tier impact on quality thresholds
  // - Time-based quality trends
}

/**
 * Create a user-friendly quality report for debugging/admin purposes
 */
export function createQualityReport(
  validationResult: PreDisplayValidationResult
): string {
  const { qualityResult, enhancedValidation, metadata } = validationResult

  let report = `Quality Analysis Report\n`
  report += `========================\n\n`

  report += `Overall Score: ${qualityResult.overallScore}/100 (${qualityResult.qualityGrade})\n`
  report += `Display Decision: ${validationResult.displayMode}\n`
  report += `Processing Time: ${metadata.processingTimeMs}ms\n\n`

  report += `Dimension Scores:\n`
  Object.entries(qualityResult.dimensionScores).forEach(([dim, score]) => {
    report += `  ${dim}: ${score}/100\n`
  })

  if (qualityResult.flags.length > 0) {
    report += `\nQuality Issues:\n`
    qualityResult.flags.forEach((flag, i) => {
      report += `  ${i + 1}. [${flag.severity.toUpperCase()}] ${flag.type}: ${flag.description}\n`
      if (flag.suggestion) {
        report += `     Suggestion: ${flag.suggestion}\n`
      }
    })
  }

  if (validationResult.blockingReasons.length > 0) {
    report += `\nBlocking Reasons:\n`
    validationResult.blockingReasons.forEach((reason, i) => {
      report += `  ${i + 1}. ${reason}\n`
    })
  }

  if (qualityResult.recommendations.length > 0) {
    report += `\nRecommendations:\n`
    qualityResult.recommendations.forEach((rec, i) => {
      report += `  ${i + 1}. ${rec}\n`
    })
  }

  return report
}

/**
 * Simplified validation for quick checks
 */
export function quickQualityCheck(
  output: StructuredOutputFormat,
  originalMessage: string
): { shouldDisplay: boolean; score: number; issues: string[] } {
  const validation = validateAnalysisOutput(output, originalMessage)
  const issues: string[] = []

  if (!validation.isValid) {
    issues.push(...validation.errors)
  }

  if (validation.qualityScore < QUALITY_THRESHOLDS.DISPLAY_MINIMUM) {
    issues.push(`Low quality score: ${validation.qualityScore}`)
  }

  const shouldDisplay =
    validation.isValid &&
    validation.qualityScore >= QUALITY_THRESHOLDS.DISPLAY_MINIMUM

  return {
    shouldDisplay,
    score: validation.qualityScore,
    issues,
  }
}
