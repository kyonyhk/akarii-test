/**
 * Automatic Retry System for Failed Quality Validations
 * Implements intelligent retry logic with backoff and failure analysis
 */

import { StructuredOutputFormat } from './promptConfig'
import {
  evaluateAnalysisQuality,
  AnalysisQualityInput,
  ComprehensiveQualityResult,
  QUALITY_THRESHOLDS,
} from './qualityValidation'
import {
  validateForDisplay,
  ValidationContext,
  PreDisplayValidationResult,
} from './preDisplayValidation'

export interface RetryContext {
  originalMessageId: string
  originalContent: string
  userId: string
  conversationId: string
  teamId?: string
  promptConfig: {
    variant: string
    mode: string
    experimentId?: string
  }
  conversationContext?: string
  maxRetries: number
  currentRetry: number
  previousAttempts: RetryAttempt[]
}

export interface RetryAttempt {
  attemptNumber: number
  timestamp: number
  qualityScore: number
  qualityGrade: string
  failureReasons: string[]
  strategyUsed: RetryStrategy
  promptAdjustments: string[]
  processingTimeMs: number
  success: boolean
}

export interface RetryStrategy {
  name: string
  description: string
  promptModifications: {
    addClarifications?: string[]
    adjustConfidenceInstructions?: boolean
    emphasizeSpecificity?: boolean
    addExamples?: boolean
    simplifyInstructions?: boolean
  }
  parameterAdjustments: {
    temperature?: number
    maxTokens?: number
    timeoutMs?: number
  }
}

export interface RetryResult {
  shouldRetry: boolean
  strategy?: RetryStrategy
  estimatedSuccessProbability: number
  recommendation: string
  backoffDelayMs: number
  adjustedPromptConfig?: any
}

// Available retry strategies
const RETRY_STRATEGIES: RetryStrategy[] = [
  {
    name: 'clarification_boost',
    description: 'Add clarifying instructions to improve analysis clarity',
    promptModifications: {
      addClarifications: [
        'Be extra specific and concrete in your analysis.',
        'Avoid vague language like "it depends" or "various factors".',
        'Provide detailed reasoning for your confidence level.',
      ],
      emphasizeSpecificity: true,
    },
    parameterAdjustments: {
      temperature: 0.3, // Lower temperature for more focused responses
    },
  },
  {
    name: 'confidence_calibration',
    description: 'Adjust confidence calibration instructions',
    promptModifications: {
      adjustConfidenceInstructions: true,
      addClarifications: [
        'Set confidence level based on the quality and completeness of your analysis.',
        'Use lower confidence (30-60) for ambiguous statements.',
        'Use higher confidence (70-90) only when analysis is comprehensive and clear.',
      ],
    },
    parameterAdjustments: {
      temperature: 0.4,
    },
  },
  {
    name: 'structure_enhancement',
    description: 'Improve analysis structure and coherence',
    promptModifications: {
      addClarifications: [
        'Ensure beliefs and trade-offs are logically connected.',
        'Make sure reasoning clearly explains how you identified beliefs and trade-offs.',
        'Use specific language rather than generic phrases.',
      ],
      addExamples: true,
    },
    parameterAdjustments: {
      maxTokens: 400, // Allow more tokens for detailed analysis
    },
  },
  {
    name: 'simplified_approach',
    description: 'Simplify analysis approach for difficult cases',
    promptModifications: {
      simplifyInstructions: true,
      addClarifications: [
        'Focus on the most obvious beliefs and trade-offs.',
        "It's better to provide fewer, high-quality insights than many generic ones.",
        'If uncertain, acknowledge the limitation rather than guessing.',
      ],
    },
    parameterAdjustments: {
      temperature: 0.5,
      maxTokens: 300,
    },
  },
  {
    name: 'extended_reasoning',
    description: 'Encourage more detailed reasoning and analysis',
    promptModifications: {
      addClarifications: [
        'Provide extensive reasoning for your analysis.',
        'Explain the thought process behind identifying each belief and trade-off.',
        'Connect your analysis directly to specific parts of the original message.',
      ],
    },
    parameterAdjustments: {
      maxTokens: 500,
      timeoutMs: 2500, // Allow more time for detailed analysis
    },
  },
]

/**
 * Determine if an analysis should be retried based on quality results
 */
export function shouldRetryAnalysis(
  qualityResult: ComprehensiveQualityResult,
  validationResult: PreDisplayValidationResult,
  retryContext: RetryContext
): RetryResult {
  const { maxRetries, currentRetry, previousAttempts } = retryContext

  // Don't retry if we've reached max attempts
  if (currentRetry >= maxRetries) {
    return {
      shouldRetry: false,
      estimatedSuccessProbability: 0,
      recommendation: 'Maximum retry attempts reached',
      backoffDelayMs: 0,
    }
  }

  // Don't retry if quality is acceptable
  if (qualityResult.overallScore >= QUALITY_THRESHOLDS.RETRY_THRESHOLD) {
    return {
      shouldRetry: false,
      estimatedSuccessProbability: 1,
      recommendation: 'Quality acceptable, no retry needed',
      backoffDelayMs: 0,
    }
  }

  // Analyze failure patterns to determine best strategy
  const failureAnalysis = analyzeFailurePatterns(
    qualityResult,
    previousAttempts
  )
  const strategy = selectRetryStrategy(failureAnalysis, currentRetry)

  // Estimate success probability based on strategy and failure history
  const successProbability = estimateSuccessProbability(
    qualityResult,
    strategy,
    previousAttempts
  )

  // Don't retry if success probability is too low
  if (successProbability < 0.2) {
    return {
      shouldRetry: false,
      estimatedSuccessProbability: successProbability,
      recommendation: 'Success probability too low, recommend human review',
      backoffDelayMs: 0,
    }
  }

  // Calculate backoff delay (exponential with jitter)
  const baseDelay = 1000 // 1 second
  const exponentialDelay = baseDelay * Math.pow(2, currentRetry)
  const jitter = Math.random() * 500 // 0-500ms jitter
  const backoffDelayMs = exponentialDelay + jitter

  return {
    shouldRetry: true,
    strategy,
    estimatedSuccessProbability: successProbability,
    recommendation: `Retry with ${strategy.name} strategy`,
    backoffDelayMs,
    adjustedPromptConfig: createAdjustedPromptConfig(
      retryContext.promptConfig,
      strategy
    ),
  }
}

/**
 * Analyze failure patterns from previous attempts
 */
function analyzeFailurePatterns(
  qualityResult: ComprehensiveQualityResult,
  previousAttempts: RetryAttempt[]
): string[] {
  const patterns: string[] = []

  // Analyze current quality issues
  const lowScoreDimensions = Object.entries(qualityResult.dimensionScores)
    .filter(([_, score]) => score < 60)
    .map(([dimension, _]) => dimension)

  if (lowScoreDimensions.includes('content_specificity')) {
    patterns.push('vague_content')
  }

  if (lowScoreDimensions.includes('content_coherence')) {
    patterns.push('coherence_issues')
  }

  if (lowScoreDimensions.includes('confidence_calibration')) {
    patterns.push('confidence_mismatch')
  }

  if (lowScoreDimensions.includes('content_completeness')) {
    patterns.push('incomplete_analysis')
  }

  // Analyze flag patterns
  const flagTypes = qualityResult.flags.map(f => f.type)
  if (flagTypes.includes('specificity')) {
    patterns.push('generic_language')
  }

  if (flagTypes.includes('consistency')) {
    patterns.push('internal_inconsistency')
  }

  // Analyze historical patterns
  if (previousAttempts.length > 0) {
    const commonFailures = previousAttempts
      .flatMap(attempt => attempt.failureReasons)
      .reduce(
        (acc, reason) => {
          acc[reason] = (acc[reason] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

    // Identify persistent issues
    Object.entries(commonFailures).forEach(([reason, count]) => {
      if (count >= 2) {
        patterns.push(`persistent_${reason}`)
      }
    })
  }

  return patterns
}

/**
 * Select the best retry strategy based on failure patterns
 */
function selectRetryStrategy(
  failurePatterns: string[],
  attemptNumber: number
): RetryStrategy {
  // Strategy selection based on failure patterns
  if (
    failurePatterns.includes('vague_content') ||
    failurePatterns.includes('generic_language')
  ) {
    return RETRY_STRATEGIES.find(s => s.name === 'clarification_boost')!
  }

  if (failurePatterns.includes('confidence_mismatch')) {
    return RETRY_STRATEGIES.find(s => s.name === 'confidence_calibration')!
  }

  if (
    failurePatterns.includes('coherence_issues') ||
    failurePatterns.includes('internal_inconsistency')
  ) {
    return RETRY_STRATEGIES.find(s => s.name === 'structure_enhancement')!
  }

  if (failurePatterns.includes('incomplete_analysis')) {
    return RETRY_STRATEGIES.find(s => s.name === 'extended_reasoning')!
  }

  // Progressive strategy selection based on attempt number
  if (attemptNumber === 1) {
    return RETRY_STRATEGIES.find(s => s.name === 'clarification_boost')!
  } else if (attemptNumber === 2) {
    return RETRY_STRATEGIES.find(s => s.name === 'structure_enhancement')!
  } else {
    return RETRY_STRATEGIES.find(s => s.name === 'simplified_approach')!
  }
}

/**
 * Estimate success probability for a retry strategy
 */
function estimateSuccessProbability(
  qualityResult: ComprehensiveQualityResult,
  strategy: RetryStrategy,
  previousAttempts: RetryAttempt[]
): number {
  let baseProbability = 0.7 // Base success probability

  // Adjust based on current quality score
  const qualityScore = qualityResult.overallScore
  if (qualityScore < 30) {
    baseProbability *= 0.5 // Very low quality reduces success chance
  } else if (qualityScore < 50) {
    baseProbability *= 0.7
  } else if (qualityScore > 55) {
    baseProbability *= 1.2 // Close to threshold increases success chance
  }

  // Adjust based on number of previous attempts
  const attemptPenalty = previousAttempts.length * 0.15
  baseProbability -= attemptPenalty

  // Adjust based on strategy effectiveness for specific issues
  const hasSpecificityIssues = qualityResult.flags.some(
    f => f.type === 'specificity'
  )
  const hasCoherenceIssues = qualityResult.flags.some(
    f => f.type === 'coherence'
  )

  if (strategy.name === 'clarification_boost' && hasSpecificityIssues) {
    baseProbability *= 1.3
  }

  if (strategy.name === 'structure_enhancement' && hasCoherenceIssues) {
    baseProbability *= 1.4
  }

  // Check if this strategy was already tried
  const strategyAlreadyTried = previousAttempts.some(
    attempt => attempt.strategyUsed.name === strategy.name
  )
  if (strategyAlreadyTried) {
    baseProbability *= 0.6 // Reduce probability if strategy already failed
  }

  return Math.max(0, Math.min(1, baseProbability))
}

/**
 * Create adjusted prompt configuration for retry
 */
function createAdjustedPromptConfig(
  originalConfig: any,
  strategy: RetryStrategy
): any {
  const adjustedConfig = { ...originalConfig }

  // Apply parameter adjustments
  if (strategy.parameterAdjustments.temperature !== undefined) {
    adjustedConfig.temperature = strategy.parameterAdjustments.temperature
  }

  if (strategy.parameterAdjustments.maxTokens !== undefined) {
    adjustedConfig.maxTokens = strategy.parameterAdjustments.maxTokens
  }

  if (strategy.parameterAdjustments.timeoutMs !== undefined) {
    adjustedConfig.timeoutMs = strategy.parameterAdjustments.timeoutMs
  }

  // Add retry-specific metadata
  adjustedConfig.retryStrategy = strategy.name
  adjustedConfig.retryModifications = strategy.promptModifications

  return adjustedConfig
}

/**
 * Execute retry with enhanced validation
 */
export async function executeRetryWithValidation(
  ctx: any,
  retryContext: RetryContext,
  retryResult: RetryResult
): Promise<{
  success: boolean
  result?: StructuredOutputFormat
  validationResult?: PreDisplayValidationResult
  attempt: RetryAttempt
}> {
  const startTime = Date.now()
  const attemptNumber = retryContext.currentRetry + 1

  try {
    // Wait for backoff delay
    if (retryResult.backoffDelayMs > 0) {
      await new Promise(resolve =>
        setTimeout(resolve, retryResult.backoffDelayMs)
      )
    }

    // Execute the retry with adjusted configuration
    // This would call the main analysis function with the adjusted config
    // For now, we'll simulate the retry logic
    console.log(
      `Executing retry ${attemptNumber} with strategy: ${retryResult.strategy!.name}`
    )

    // In a real implementation, this would:
    // 1. Apply prompt modifications from the strategy
    // 2. Use adjusted parameters (temperature, maxTokens, etc.)
    // 3. Re-run the OpenAI analysis
    // 4. Validate the new result

    // For demonstration, we'll create a mock attempt record
    const attempt: RetryAttempt = {
      attemptNumber,
      timestamp: Date.now(),
      qualityScore: 0, // Would be set after analysis
      qualityGrade: 'F', // Would be set after analysis
      failureReasons: [],
      strategyUsed: retryResult.strategy!,
      promptAdjustments: Object.values(
        retryResult.strategy!.promptModifications.addClarifications || []
      ),
      processingTimeMs: Date.now() - startTime,
      success: false, // Would be determined after validation
    }

    console.log(
      `Retry attempt ${attemptNumber} completed in ${attempt.processingTimeMs}ms`
    )

    return {
      success: false, // Would be determined by actual analysis
      attempt,
    }
  } catch (error) {
    console.error(`Retry attempt ${attemptNumber} failed:`, error)

    const attempt: RetryAttempt = {
      attemptNumber,
      timestamp: Date.now(),
      qualityScore: 0,
      qualityGrade: 'F',
      failureReasons: ['retry_execution_error'],
      strategyUsed: retryResult.strategy!,
      promptAdjustments: [],
      processingTimeMs: Date.now() - startTime,
      success: false,
    }

    return {
      success: false,
      attempt,
    }
  }
}

/**
 * Create retry context from analysis request
 */
export function createRetryContext(
  messageId: string,
  content: string,
  userId: string,
  conversationId: string,
  promptConfig: any,
  teamId?: string,
  conversationContext?: string,
  maxRetries: number = 3
): RetryContext {
  return {
    originalMessageId: messageId,
    originalContent: content,
    userId,
    conversationId,
    teamId,
    promptConfig,
    conversationContext,
    maxRetries,
    currentRetry: 0,
    previousAttempts: [],
  }
}

/**
 * Log retry metrics for monitoring
 */
export function logRetryMetrics(
  retryContext: RetryContext,
  attempts: RetryAttempt[],
  finalSuccess: boolean
): void {
  const totalAttempts = attempts.length
  const totalTime = attempts.reduce(
    (sum, attempt) => sum + attempt.processingTimeMs,
    0
  )
  const strategiesUsed = [...new Set(attempts.map(a => a.strategyUsed.name))]

  console.log(
    `Retry sequence completed for message ${retryContext.originalMessageId}:`,
    {
      totalAttempts,
      finalSuccess,
      totalTimeMs: totalTime,
      strategiesUsed,
      qualityProgression: attempts.map(a => a.qualityScore),
    }
  )

  // In production, this would send metrics to monitoring system
  // - Retry success rates by strategy
  // - Average attempts needed for success
  // - Time spent on retries
  // - Most common failure patterns
  // - Strategy effectiveness metrics
}
