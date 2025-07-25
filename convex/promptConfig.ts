// Structured output formatting and prompt configuration system

import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT_TEMPLATE,
  PROMPT_VARIATIONS,
} from './prompts'
import {
  createContextAwarePrompt,
  ConversationContext,
  ContextAnalysisOptions,
} from './contextAnalysis'

export type PromptVariant =
  | 'standard'
  | 'question_focused'
  | 'confidence_calibrated'
  | 'context_aware'
export type AnalysisMode = 'production' | 'testing' | 'a_b_test'

export interface PromptConfiguration {
  variant: PromptVariant
  mode: AnalysisMode
  contextOptions?: ContextAnalysisOptions
  experimentId?: string // For A/B testing tracking
}

export interface StructuredOutputFormat {
  statement_type: 'question' | 'opinion' | 'fact' | 'request' | 'other'
  beliefs: string[]
  trade_offs: string[]
  confidence_level: number
  reasoning: string
  // Enhanced metadata for quality tracking
  metadata?: {
    prompt_variant: PromptVariant
    context_quality?: 'high' | 'medium' | 'low'
    processing_time_ms?: number
    experiment_id?: string
  }
}

/**
 * Validation rules for structured output format
 */
export const OUTPUT_VALIDATION_RULES = {
  statement_type: {
    required: true,
    allowedValues: ['question', 'opinion', 'fact', 'request', 'other'] as const,
    errorMessage:
      'statement_type must be one of: question, opinion, fact, request, other',
  },
  beliefs: {
    required: true,
    type: 'array' as const,
    maxItems: 3,
    itemMaxLength: 15,
    errorMessage: 'beliefs must be array with max 3 items, each max 15 words',
  },
  trade_offs: {
    required: true,
    type: 'array' as const,
    maxItems: 3,
    itemMaxLength: 15,
    errorMessage:
      'trade_offs must be array with max 3 items, each max 15 words',
  },
  confidence_level: {
    required: true,
    type: 'number' as const,
    min: 0,
    max: 100,
    errorMessage: 'confidence_level must be number between 0-100',
  },
  reasoning: {
    required: true,
    type: 'string' as const,
    minLength: 20,
    maxLength: 500,
    errorMessage: 'reasoning must be string between 20-500 characters',
  },
} as const

/**
 * Generates the appropriate system prompt based on configuration
 */
export function getSystemPrompt(config: PromptConfiguration): string {
  switch (config.variant) {
    case 'question_focused':
      return PROMPT_VARIATIONS.QUESTION_FOCUSED_SYSTEM
    case 'confidence_calibrated':
    case 'context_aware':
      return ANALYSIS_SYSTEM_PROMPT // Use enhanced system prompt
    case 'standard':
    default:
      return ANALYSIS_SYSTEM_PROMPT
  }
}

/**
 * Generates the appropriate user prompt based on configuration
 */
export function getUserPrompt(
  messageContent: string,
  config: PromptConfiguration,
  context?: ConversationContext
): string {
  switch (config.variant) {
    case 'confidence_calibrated':
      return PROMPT_VARIATIONS.CONFIDENCE_CALIBRATED_USER(messageContent)

    case 'context_aware':
      return createContextAwarePrompt(
        messageContent,
        context,
        config.contextOptions
      )

    case 'question_focused':
    case 'standard':
    default:
      return ANALYSIS_USER_PROMPT_TEMPLATE(messageContent)
  }
}

/**
 * Validates structured output format against defined rules
 */
export function validateStructuredOutput(output: any): {
  isValid: boolean
  errors: string[]
  sanitizedOutput?: StructuredOutputFormat
} {
  const errors: string[] = []

  if (!output || typeof output !== 'object') {
    return { isValid: false, errors: ['Output must be a valid JSON object'] }
  }

  // Validate statement_type
  if (
    !OUTPUT_VALIDATION_RULES.statement_type.allowedValues.includes(
      output.statement_type
    )
  ) {
    errors.push(OUTPUT_VALIDATION_RULES.statement_type.errorMessage)
  }

  // Validate beliefs array
  if (!Array.isArray(output.beliefs)) {
    errors.push(OUTPUT_VALIDATION_RULES.beliefs.errorMessage)
  } else {
    if (output.beliefs.length > OUTPUT_VALIDATION_RULES.beliefs.maxItems) {
      errors.push(
        `beliefs array has ${output.beliefs.length} items, max allowed is ${OUTPUT_VALIDATION_RULES.beliefs.maxItems}`
      )
    }
    output.beliefs.forEach((belief: string, index: number) => {
      if (typeof belief !== 'string') {
        errors.push(`beliefs[${index}] must be a string`)
      } else if (
        belief.split(' ').length > OUTPUT_VALIDATION_RULES.beliefs.itemMaxLength
      ) {
        errors.push(
          `beliefs[${index}] exceeds ${OUTPUT_VALIDATION_RULES.beliefs.itemMaxLength} words`
        )
      }
    })
  }

  // Validate trade_offs array
  if (!Array.isArray(output.trade_offs)) {
    errors.push(OUTPUT_VALIDATION_RULES.trade_offs.errorMessage)
  } else {
    if (
      output.trade_offs.length > OUTPUT_VALIDATION_RULES.trade_offs.maxItems
    ) {
      errors.push(
        `trade_offs array has ${output.trade_offs.length} items, max allowed is ${OUTPUT_VALIDATION_RULES.trade_offs.maxItems}`
      )
    }
    output.trade_offs.forEach((tradeOff: string, index: number) => {
      if (typeof tradeOff !== 'string') {
        errors.push(`trade_offs[${index}] must be a string`)
      } else if (
        tradeOff.split(' ').length >
        OUTPUT_VALIDATION_RULES.trade_offs.itemMaxLength
      ) {
        errors.push(
          `trade_offs[${index}] exceeds ${OUTPUT_VALIDATION_RULES.trade_offs.itemMaxLength} words`
        )
      }
    })
  }

  // Validate confidence_level
  if (
    typeof output.confidence_level !== 'number' ||
    output.confidence_level < OUTPUT_VALIDATION_RULES.confidence_level.min ||
    output.confidence_level > OUTPUT_VALIDATION_RULES.confidence_level.max
  ) {
    errors.push(OUTPUT_VALIDATION_RULES.confidence_level.errorMessage)
  }

  // Validate reasoning
  if (
    typeof output.reasoning !== 'string' ||
    output.reasoning.length < OUTPUT_VALIDATION_RULES.reasoning.minLength ||
    output.reasoning.length > OUTPUT_VALIDATION_RULES.reasoning.maxLength
  ) {
    errors.push(OUTPUT_VALIDATION_RULES.reasoning.errorMessage)
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  // Create sanitized output
  const sanitizedOutput: StructuredOutputFormat = {
    statement_type: output.statement_type,
    beliefs: Array.isArray(output.beliefs) ? output.beliefs.slice(0, 3) : [],
    trade_offs: Array.isArray(output.trade_offs)
      ? output.trade_offs.slice(0, 3)
      : [],
    confidence_level: Math.max(
      0,
      Math.min(100, Math.round(output.confidence_level))
    ),
    reasoning: output.reasoning,
  }

  return { isValid: true, errors: [], sanitizedOutput }
}

/**
 * Applies confidence calibration rules based on analysis patterns
 */
export function applyConfidenceCalibration(
  output: StructuredOutputFormat,
  config: PromptConfiguration
): StructuredOutputFormat {
  let adjustedConfidence = output.confidence_level

  // Apply historical calibration adjustments
  switch (output.statement_type) {
    case 'question':
      // Reduce confidence by 15% for questions (historical overconfidence)
      adjustedConfidence = Math.max(0, adjustedConfidence - 15)
      break
    case 'other':
      // Cap "other" category at 60% confidence
      adjustedConfidence = Math.min(60, adjustedConfidence)
      break
  }

  // Apply variant-specific adjustments
  if (config.variant === 'confidence_calibrated') {
    // Additional conservative adjustments for calibrated variant
    if (output.beliefs.length === 0 || output.trade_offs.length === 0) {
      adjustedConfidence = Math.max(0, adjustedConfidence - 10)
    }
  }

  // Cap complex analyses at 75% confidence
  if (
    output.statement_type === 'other' ||
    (output.beliefs.length === 0 && output.trade_offs.length === 0)
  ) {
    adjustedConfidence = Math.min(75, adjustedConfidence)
  }

  return {
    ...output,
    confidence_level: Math.round(adjustedConfidence),
  }
}

/**
 * Enhanced output formatting with quality metrics
 */
export function formatAnalysisOutput(
  rawOutput: any,
  config: PromptConfiguration,
  processingTimeMs?: number,
  contextQuality?: 'high' | 'medium' | 'low'
): {
  output: StructuredOutputFormat
  validation: { isValid: boolean; errors: string[] }
  quality: { score: number; factors: string[] }
} {
  // Validate output structure
  const validation = validateStructuredOutput(rawOutput)

  if (!validation.isValid || !validation.sanitizedOutput) {
    return {
      output: {
        statement_type: 'other',
        beliefs: [],
        trade_offs: [],
        confidence_level: 0,
        reasoning: 'Validation failed: ' + validation.errors.join('; '),
      },
      validation,
      quality: { score: 0, factors: ['Validation failed'] },
    }
  }

  // Apply confidence calibration
  const calibratedOutput = applyConfidenceCalibration(
    validation.sanitizedOutput,
    config
  )

  // Add metadata
  const outputWithMetadata: StructuredOutputFormat = {
    ...calibratedOutput,
    metadata: {
      prompt_variant: config.variant,
      context_quality: contextQuality,
      processing_time_ms: processingTimeMs,
      experiment_id: config.experimentId,
    },
  }

  // Calculate quality score
  const quality = calculateQualityScore(outputWithMetadata)

  return {
    output: outputWithMetadata,
    validation,
    quality,
  }
}

/**
 * Calculate quality score based on multiple factors
 */
function calculateQualityScore(output: StructuredOutputFormat): {
  score: number
  factors: string[]
} {
  let score = 100
  const factors: string[] = []

  // Reasoning quality (40% of score)
  const reasoningLength = output.reasoning.length
  if (reasoningLength < 50) {
    score -= 20
    factors.push('Short reasoning')
  } else if (reasoningLength > 300) {
    score -= 10
    factors.push('Verbose reasoning')
  }

  // Content completeness (30% of score)
  if (output.beliefs.length === 0) {
    score -= 15
    factors.push('No beliefs identified')
  }
  if (output.trade_offs.length === 0) {
    score -= 15
    factors.push('No trade-offs identified')
  }

  // Confidence calibration (20% of score)
  if (output.statement_type === 'question' && output.confidence_level > 85) {
    score -= 15
    factors.push('Overconfident on question')
  }
  if (output.statement_type === 'other' && output.confidence_level > 60) {
    score -= 10
    factors.push('Overconfident on other category')
  }

  // Statement type clarity (10% of score)
  if (output.statement_type === 'other') {
    score -= 5
    factors.push('Unclear categorization')
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    factors: factors.length > 0 ? factors : ['High quality analysis'],
  }
}

/**
 * Default configuration for production use
 */
export const DEFAULT_PRODUCTION_CONFIG: PromptConfiguration = {
  variant: 'standard',
  mode: 'production',
  contextOptions: {
    maxContextMessages: 5,
    includeParticipants: true,
    useContextAwarePrompt: false,
  },
}

/**
 * Configuration for A/B testing question-focused improvements
 */
export const QUESTION_FOCUSED_TEST_CONFIG: PromptConfiguration = {
  variant: 'question_focused',
  mode: 'a_b_test',
  experimentId: 'question_analysis_v2',
  contextOptions: {
    maxContextMessages: 3,
    includeParticipants: false,
    useContextAwarePrompt: false,
  },
}
