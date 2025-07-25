/**
 * Automatic Retry Logic for Failed Quality Validations
 * Intelligent retry system based on quality scores and failure patterns
 */

import { StructuredOutputFormat } from './promptConfig'
import {
  ComprehensiveQualityResult,
  QUALITY_THRESHOLDS,
} from './qualityValidation'
import { PreDisplayValidationResult } from './preDisplayValidation'

export interface RetryConfiguration {
  maxRetries: number
  baseDelayMs: number
  backoffMultiplier: number
  qualityThreshold: number
  retryableErrorCodes: string[]
  retryableQualityIssues: string[]
}

export interface RetryContext {
  attemptNumber: number
  previousResults: RetryAttemptResult[]
  totalElapsedMs: number
  lastError?: string
  qualityTrend: number[] // Quality scores from previous attempts
}

export interface RetryAttemptResult {
  attemptNumber: number
  success: boolean
  qualityScore: number
  error?: string
  elapsedMs: number
  timestamp: number
  promptVariant?: string
  retryReason: string
}

export interface RetryDecision {
  shouldRetry: boolean
  reason: string
  suggestedDelay: number
  suggestedPromptVariant?: string
  maxAttemptsReached: boolean
  confidenceAdjustment: number
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfiguration = {
  maxRetries: 3,
  baseDelayMs: 500,
  backoffMultiplier: 1.5,
  qualityThreshold: QUALITY_THRESHOLDS.RETRY_THRESHOLD,
  retryableErrorCodes: [
    'quality_threshold_failed',
    'validation_failed',
    'api_timeout',
    'rate_limit_exceeded',
    'temporary_service_unavailable',
  ],
  retryableQualityIssues: [
    'coherence',
    'consistency',
    'completeness',
    'confidence_mismatch',
  ],
}

/**
 * Determine if a failed analysis should be retried
 */
export function shouldRetryAnalysis(
  validationResult: PreDisplayValidationResult,
  retryContext: RetryContext,
  config: RetryConfiguration = DEFAULT_RETRY_CONFIG
): RetryDecision {
  const { attemptNumber, previousResults, qualityTrend } = retryContext
  const { qualityResult } = validationResult

  // Check if max retries reached
  if (attemptNumber >= config.maxRetries) {
    return {
      shouldRetry: false,
      reason: 'Maximum retry attempts reached',
      suggestedDelay: 0,
      maxAttemptsReached: true,
      confidenceAdjustment: -20, // Penalize confidence for repeated failures
    }
  }

  // Check if quality is improving over attempts
  const isQualityImproving =
    qualityTrend.length > 1 &&
    qualityTrend[qualityTrend.length - 1] >
      qualityTrend[qualityTrend.length - 2]

  // Don't retry if quality is getting worse consistently
  if (qualityTrend.length >= 2 && !isQualityImproving) {
    const recentDecline = qualityTrend.slice(-2)
    if (recentDecline[1] < recentDecline[0] - 10) {
      return {
        shouldRetry: false,
        reason: 'Quality declining with retries',
        suggestedDelay: 0,
        maxAttemptsReached: false,
        confidenceAdjustment: -15,
      }
    }
  }

  // Analyze the specific quality issues
  const retryableIssues = qualityResult.flags.filter(flag =>
    config.retryableQualityIssues.includes(flag.type)
  )

  if (
    retryableIssues.length === 0 &&
    qualityResult.overallScore > config.qualityThreshold
  ) {
    return {
      shouldRetry: false,
      reason: 'No retryable quality issues found',
      suggestedDelay: 0,
      maxAttemptsReached: false,
      confidenceAdjustment: 0,
    }
  }

  // Calculate retry delay with exponential backoff
  const delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1),
    5000 // Cap at 5 seconds
  )

  // Suggest prompt variant based on the type of issues
  let suggestedPromptVariant: string | undefined
  const predominantIssueType = getMostCommonIssueType(qualityResult.flags)

  switch (predominantIssueType) {
    case 'coherence':
      suggestedPromptVariant = 'confidence_calibrated'
      break
    case 'completeness':
      suggestedPromptVariant = 'context_aware'
      break
    case 'specificity':
      suggestedPromptVariant = 'question_focused'
      break
    default:
      // Cycle through variants
      const variants = [
        'standard',
        'question_focused',
        'confidence_calibrated',
        'context_aware',
      ]
      suggestedPromptVariant = variants[attemptNumber % variants.length]
  }

  // Determine confidence adjustment based on retry necessity
  let confidenceAdjustment = 0
  if (qualityResult.overallScore < 50) {
    confidenceAdjustment = -10 // Significant quality issues
  } else if (qualityResult.overallScore < 65) {
    confidenceAdjustment = -5 // Minor quality issues
  }

  return {
    shouldRetry: true,
    reason: `Quality score ${qualityResult.overallScore} below threshold (${config.qualityThreshold}), retryable issues: ${retryableIssues.map(i => i.type).join(', ')}`,
    suggestedDelay: delay,
    suggestedPromptVariant,
    maxAttemptsReached: false,
    confidenceAdjustment,
  }
}

/**
 * Create a retry context from previous attempts
 */
export function createRetryContext(
  previousAttempts: RetryAttemptResult[],
  currentAttemptNumber: number
): RetryContext {
  const totalElapsedMs = previousAttempts.reduce(
    (sum, attempt) => sum + attempt.elapsedMs,
    0
  )
  const qualityTrend = previousAttempts.map(attempt => attempt.qualityScore)
  const lastError = previousAttempts[previousAttempts.length - 1]?.error

  return {
    attemptNumber: currentAttemptNumber,
    previousResults: previousAttempts,
    totalElapsedMs,
    lastError,
    qualityTrend,
  }
}

/**
 * Record a retry attempt result
 */
export function recordRetryAttempt(
  attemptNumber: number,
  success: boolean,
  qualityScore: number,
  elapsedMs: number,
  retryReason: string,
  error?: string,
  promptVariant?: string
): RetryAttemptResult {
  return {
    attemptNumber,
    success,
    qualityScore,
    error,
    elapsedMs,
    timestamp: Date.now(),
    promptVariant,
    retryReason,
  }
}

/**
 * Get the most common issue type from quality flags
 */
function getMostCommonIssueType(flags: any[]): string {
  const counts: Record<string, number> = {}

  flags.forEach(flag => {
    counts[flag.type] = (counts[flag.type] || 0) + 1
  })

  return (
    Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown'
  )
}

/**
 * Analyze retry patterns to suggest improvements
 */
export function analyzeRetryPatterns(attempts: RetryAttemptResult[]): {
  successRate: number
  averageAttemptsToSuccess: number
  commonFailureReasons: string[]
  mostEffectivePromptVariant?: string
  recommendations: string[]
} {
  const successfulAttempts = attempts.filter(a => a.success)
  const failedAttempts = attempts.filter(a => !a.success)

  const successRate =
    attempts.length > 0 ? successfulAttempts.length / attempts.length : 0

  // Calculate average attempts to success
  const attemptsToSuccess: number[] = []
  let currentSequence = 0

  attempts.forEach(attempt => {
    currentSequence++
    if (attempt.success) {
      attemptsToSuccess.push(currentSequence)
      currentSequence = 0
    }
  })

  const averageAttemptsToSuccess =
    attemptsToSuccess.length > 0
      ? attemptsToSuccess.reduce((sum, count) => sum + count, 0) /
        attemptsToSuccess.length
      : 0

  // Find common failure reasons
  const failureReasonCounts: Record<string, number> = {}
  failedAttempts.forEach(attempt => {
    if (attempt.error) {
      failureReasonCounts[attempt.error] =
        (failureReasonCounts[attempt.error] || 0) + 1
    }
  })

  const commonFailureReasons = Object.entries(failureReasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([reason]) => reason)

  // Find most effective prompt variant
  const variantSuccessRates: Record<
    string,
    { success: number; total: number }
  > = {}
  attempts.forEach(attempt => {
    if (attempt.promptVariant) {
      if (!variantSuccessRates[attempt.promptVariant]) {
        variantSuccessRates[attempt.promptVariant] = { success: 0, total: 0 }
      }
      variantSuccessRates[attempt.promptVariant].total++
      if (attempt.success) {
        variantSuccessRates[attempt.promptVariant].success++
      }
    }
  })

  const mostEffectivePromptVariant = Object.entries(variantSuccessRates)
    .map(([variant, stats]) => ({
      variant,
      successRate: stats.success / stats.total,
    }))
    .sort((a, b) => b.successRate - a.successRate)[0]?.variant

  // Generate recommendations
  const recommendations: string[] = []

  if (successRate < 0.7) {
    recommendations.push(
      'Consider adjusting quality thresholds or prompt engineering'
    )
  }

  if (averageAttemptsToSuccess > 2) {
    recommendations.push(
      'Implement smarter initial prompt selection to reduce retries'
    )
  }

  if (commonFailureReasons.includes('coherence')) {
    recommendations.push('Focus on improving prompt coherence instructions')
  }

  if (commonFailureReasons.includes('completeness')) {
    recommendations.push('Enhance prompts to encourage more thorough analysis')
  }

  return {
    successRate,
    averageAttemptsToSuccess,
    commonFailureReasons,
    mostEffectivePromptVariant,
    recommendations,
  }
}

/**
 * Smart delay calculation based on system load and error type
 */
export function calculateSmartDelay(
  baseDelay: number,
  attemptNumber: number,
  errorType?: string,
  systemLoad?: 'low' | 'medium' | 'high'
): number {
  let delay = baseDelay * Math.pow(1.5, attemptNumber - 1)

  // Adjust for error type
  switch (errorType) {
    case 'rate_limit_exceeded':
      delay *= 3 // Longer delay for rate limits
      break
    case 'api_timeout':
      delay *= 2 // Moderate delay for timeouts
      break
    case 'quality_threshold_failed':
      delay *= 0.5 // Shorter delay for quality issues
      break
  }

  // Adjust for system load
  switch (systemLoad) {
    case 'high':
      delay *= 2
      break
    case 'medium':
      delay *= 1.3
      break
    case 'low':
      delay *= 0.8
      break
  }

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay
  delay += jitter

  return Math.min(delay, 10000) // Cap at 10 seconds
}

/**
 * Exponential backoff with jitter for distributed systems
 */
export function exponentialBackoffWithJitter(
  attemptNumber: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
  jitterFactor: number = 0.1
): number {
  const exponentialDelay = Math.min(
    baseDelayMs * Math.pow(2, attemptNumber - 1),
    maxDelayMs
  )
  const jitter = exponentialDelay * jitterFactor * Math.random()
  return exponentialDelay + jitter
}

/**
 * Circuit breaker pattern for preventing cascade failures
 */
export class RetryCircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeMs: number = 60000 // 1 minute
  ) {}

  canRetry(): boolean {
    const now = Date.now()

    switch (this.state) {
      case 'closed':
        return true

      case 'open':
        if (now - this.lastFailureTime >= this.recoveryTimeMs) {
          this.state = 'half-open'
          return true
        }
        return false

      case 'half-open':
        return true

      default:
        return false
    }
  }

  recordSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
    }
  }

  getState(): string {
    return this.state
  }
}
