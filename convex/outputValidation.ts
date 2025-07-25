/**
 * Enhanced output validation for analysis results
 * Implements comprehensive guardrails to ensure analysis quality and coherence
 */

import { StructuredOutputFormat } from './promptConfig'

export interface EnhancedValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  qualityScore: number // 0-100
  coherenceScore: number // 0-100
  sanitizedOutput?: StructuredOutputFormat
  qualityFlags: QualityFlag[]
}

export interface QualityFlag {
  type:
    | 'coherence'
    | 'consistency'
    | 'completeness'
    | 'specificity'
    | 'confidence_mismatch'
  severity: 'low' | 'medium' | 'high'
  description: string
  suggestion?: string
}

// Enhanced validation rules
export const ENHANCED_VALIDATION_RULES = {
  beliefs: {
    minMeaningfulLength: 3, // Minimum characters for meaningful belief
    maxRepeatedWords: 2, // Maximum repeated words in beliefs array
    requiredVariety: true, // Beliefs should be diverse, not repetitive
  },
  tradeOffs: {
    minMeaningfulLength: 3,
    maxRepeatedWords: 2,
    requiredVariety: true,
    shouldContainTradeOffIndicators: true, // Should contain words like "vs", "or", "but", "however"
  },
  coherence: {
    beliefTradeOffAlignment: true, // Beliefs and trade-offs should be logically connected
    statementTypeConsistency: true, // Content should match the classified statement type
    confidenceCalibration: true, // Confidence should match analysis quality
  },
  quality: {
    minimumCompleteness: 60, // Minimum percentage of fields that should be meaningful
    minimumSpecificity: 40, // Minimum specificity score
  },
}

// Words that indicate trade-offs
const TRADE_OFF_INDICATORS = [
  'vs',
  'versus',
  'or',
  'but',
  'however',
  'although',
  'while',
  'though',
  'instead',
  'rather',
  'either',
  'between',
  'balance',
  'compromise',
  'sacrifice',
  'cost',
  'benefit',
  'downside',
  'upside',
  'pros',
  'cons',
]

// Statement type keywords for consistency checking
const STATEMENT_TYPE_KEYWORDS = {
  question: [
    '?',
    'how',
    'what',
    'why',
    'when',
    'where',
    'who',
    'which',
    'should',
    'could',
    'would',
  ],
  opinion: [
    'think',
    'believe',
    'feel',
    'opinion',
    'prefer',
    'like',
    'dislike',
    'seems',
    'appears',
  ],
  fact: [
    'is',
    'are',
    'was',
    'were',
    'has',
    'have',
    'will',
    'data',
    'shows',
    'according',
    'research',
  ],
  request: [
    'please',
    'can you',
    'could you',
    'would you',
    'help',
    'need',
    'want',
    'ask',
  ],
}

/**
 * Validates coherence between beliefs and trade-offs
 */
function validateCoherence(
  statementType: string,
  beliefs: string[],
  tradeOffs: string[],
  originalMessage: string
): { score: number; flags: QualityFlag[] } {
  const flags: QualityFlag[] = []
  let coherenceScore = 100

  // Check if beliefs and trade-offs are related
  if (beliefs.length > 0 && tradeOffs.length > 0) {
    const beliefWords = beliefs.join(' ').toLowerCase().split(/\s+/)
    const tradeOffWords = tradeOffs.join(' ').toLowerCase().split(/\s+/)

    // Calculate word overlap
    const overlap = beliefWords.filter(
      word =>
        word.length > 3 &&
        tradeOffWords.some(t => t.includes(word) || word.includes(t))
    ).length

    const totalUniqueWords = new Set([...beliefWords, ...tradeOffWords]).size
    const overlapRatio = totalUniqueWords > 0 ? overlap / totalUniqueWords : 0

    if (overlapRatio < 0.1) {
      flags.push({
        type: 'coherence',
        severity: 'medium',
        description: 'Beliefs and trade-offs appear disconnected',
        suggestion:
          'Ensure beliefs and trade-offs relate to the same concepts or decision points',
      })
      coherenceScore -= 20
    }
  }

  // Check if trade-offs actually contain trade-off language
  if (tradeOffs.length > 0) {
    const hasTradeOffIndicators = tradeOffs.some(tradeOff =>
      TRADE_OFF_INDICATORS.some(indicator =>
        tradeOff.toLowerCase().includes(indicator.toLowerCase())
      )
    )

    if (!hasTradeOffIndicators) {
      flags.push({
        type: 'specificity',
        severity: 'medium',
        description: 'Trade-offs do not contain clear trade-off language',
        suggestion:
          'Use words like "vs", "but", "however", "balance" to indicate actual trade-offs',
      })
      coherenceScore -= 15
    }
  }

  // Check statement type consistency
  const messageWords = originalMessage.toLowerCase().split(/\s+/)
  const expectedKeywords =
    STATEMENT_TYPE_KEYWORDS[
      statementType as keyof typeof STATEMENT_TYPE_KEYWORDS
    ] || []

  if (expectedKeywords.length > 0) {
    const hasExpectedKeywords = expectedKeywords.some(keyword =>
      messageWords.some(word => word.includes(keyword))
    )

    if (!hasExpectedKeywords && statementType !== 'other') {
      flags.push({
        type: 'consistency',
        severity: 'low',
        description: `Statement classified as "${statementType}" but doesn't contain typical indicators`,
        suggestion: 'Verify statement type classification accuracy',
      })
      coherenceScore -= 10
    }
  }

  return { score: Math.max(0, coherenceScore), flags }
}

/**
 * Validates completeness and specificity
 */
function validateQuality(
  beliefs: string[],
  tradeOffs: string[],
  reasoning: string
): { score: number; flags: QualityFlag[] } {
  const flags: QualityFlag[] = []
  let qualityScore = 100

  // Check for generic/vague content
  const genericPhrases = [
    'it depends',
    'various factors',
    'many things',
    'different aspects',
    'several considerations',
    'multiple elements',
    'general approach',
  ]

  // Validate beliefs specificity
  beliefs.forEach((belief, index) => {
    if (belief.length < ENHANCED_VALIDATION_RULES.beliefs.minMeaningfulLength) {
      flags.push({
        type: 'completeness',
        severity: 'medium',
        description: `Belief ${index + 1} is too brief to be meaningful`,
        suggestion: 'Provide more specific and detailed beliefs',
      })
      qualityScore -= 10
    }

    if (genericPhrases.some(phrase => belief.toLowerCase().includes(phrase))) {
      flags.push({
        type: 'specificity',
        severity: 'low',
        description: `Belief ${index + 1} contains generic language`,
        suggestion:
          'Be more specific about the underlying assumptions or values',
      })
      qualityScore -= 5
    }
  })

  // Validate trade-offs specificity
  tradeOffs.forEach((tradeOff, index) => {
    if (
      tradeOff.length < ENHANCED_VALIDATION_RULES.tradeOffs.minMeaningfulLength
    ) {
      flags.push({
        type: 'completeness',
        severity: 'medium',
        description: `Trade-off ${index + 1} is too brief to be meaningful`,
        suggestion: 'Provide more specific trade-off analysis',
      })
      qualityScore -= 10
    }

    if (
      genericPhrases.some(phrase => tradeOff.toLowerCase().includes(phrase))
    ) {
      flags.push({
        type: 'specificity',
        severity: 'low',
        description: `Trade-off ${index + 1} contains generic language`,
        suggestion: 'Be more specific about what is being traded off',
      })
      qualityScore -= 5
    }
  })

  // Check for repetition in beliefs and trade-offs
  const allBeliefs = beliefs.join(' ').toLowerCase()
  const allTradeOffs = tradeOffs.join(' ').toLowerCase()

  // Simple repetition detection
  const words = (allBeliefs + ' ' + allTradeOffs).split(/\s+/)
  const wordCounts = words.reduce(
    (acc, word) => {
      if (word.length > 3) {
        acc[word] = (acc[word] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  const repeatedWords = Object.entries(wordCounts).filter(
    ([_, count]) => count > 2
  )
  if (repeatedWords.length > 0) {
    flags.push({
      type: 'consistency',
      severity: 'low',
      description: 'Repetitive language detected in beliefs/trade-offs',
      suggestion: 'Vary language and explore different aspects',
    })
    qualityScore -= 5
  }

  return { score: Math.max(0, qualityScore), flags }
}

/**
 * Validates confidence calibration
 */
function validateConfidence(
  confidence: number,
  beliefs: string[],
  tradeOffs: string[],
  reasoning: string,
  statementType: string
): { score: number; flags: QualityFlag[] } {
  const flags: QualityFlag[] = []
  let calibrationScore = 100

  // Calculate analysis completeness
  const hasBeliefs = beliefs.length > 0 && beliefs.some(b => b.length > 3)
  const hasTradeOffs = tradeOffs.length > 0 && tradeOffs.some(t => t.length > 3)
  const hasReasoning = reasoning.length > 20

  const completenessScore =
    ((hasBeliefs ? 1 : 0) + (hasTradeOffs ? 1 : 0) + (hasReasoning ? 1 : 0)) / 3

  // Confidence should align with completeness
  if (confidence > 80 && completenessScore < 0.7) {
    flags.push({
      type: 'confidence_mismatch',
      severity: 'medium',
      description: 'High confidence despite incomplete analysis',
      suggestion:
        'Lower confidence when analysis lacks detail or reduce confidence for ambiguous statements',
    })
    calibrationScore -= 20
  }

  if (confidence < 30 && completenessScore > 0.8) {
    flags.push({
      type: 'confidence_mismatch',
      severity: 'low',
      description: 'Low confidence despite thorough analysis',
      suggestion:
        'Consider if confidence is appropriately calibrated to analysis quality',
    })
    calibrationScore -= 10
  }

  // Statement type specific calibration
  if (statementType === 'question' && confidence > 70) {
    flags.push({
      type: 'confidence_mismatch',
      severity: 'low',
      description:
        'High confidence for question analysis may indicate overconfidence',
      suggestion:
        'Questions often have inherent ambiguity about intent and underlying beliefs',
    })
    calibrationScore -= 5
  }

  return { score: Math.max(0, calibrationScore), flags }
}

/**
 * Comprehensive enhanced validation
 */
export function validateAnalysisOutput(
  output: StructuredOutputFormat,
  originalMessage: string,
  context?: string
): EnhancedValidationResult {
  const allFlags: QualityFlag[] = []
  const errors: string[] = []
  const warnings: string[] = []

  // Basic structural validation (from existing promptConfig)
  if (
    !output.statement_type ||
    !['question', 'opinion', 'fact', 'request', 'other'].includes(
      output.statement_type
    )
  ) {
    errors.push('Invalid or missing statement_type')
  }

  if (!Array.isArray(output.beliefs)) {
    errors.push('Beliefs must be an array')
  }

  if (!Array.isArray(output.trade_offs)) {
    errors.push('Trade-offs must be an array')
  }

  if (
    typeof output.confidence_level !== 'number' ||
    output.confidence_level < 0 ||
    output.confidence_level > 100
  ) {
    errors.push('Confidence level must be a number between 0 and 100')
  }

  if (!output.reasoning || typeof output.reasoning !== 'string') {
    errors.push('Reasoning must be a non-empty string')
  }

  // If basic validation fails, return early
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
      qualityScore: 0,
      coherenceScore: 0,
      qualityFlags: allFlags,
    }
  }

  // Enhanced validation
  const coherenceResult = validateCoherence(
    output.statement_type,
    output.beliefs,
    output.trade_offs,
    originalMessage
  )
  allFlags.push(...coherenceResult.flags)

  const qualityResult = validateQuality(
    output.beliefs,
    output.trade_offs,
    output.reasoning
  )
  allFlags.push(...qualityResult.flags)

  const confidenceResult = validateConfidence(
    output.confidence_level,
    output.beliefs,
    output.trade_offs,
    output.reasoning,
    output.statement_type
  )
  allFlags.push(...confidenceResult.flags)

  // Calculate overall scores
  const qualityScore = Math.round(
    (qualityResult.score + confidenceResult.score) / 2
  )
  const coherenceScore = coherenceResult.score

  // Generate warnings from flags
  allFlags.forEach(flag => {
    if (flag.severity === 'high') {
      errors.push(flag.description)
    } else if (flag.severity === 'medium') {
      warnings.push(flag.description)
    }
  })

  // Create sanitized output with quality improvements
  const sanitizedOutput: StructuredOutputFormat = {
    statement_type: output.statement_type,
    beliefs: output.beliefs
      .slice(0, 3)
      .map(b => b.trim())
      .filter(b => b.length > 0),
    trade_offs: output.trade_offs
      .slice(0, 3)
      .map(t => t.trim())
      .filter(t => t.length > 0),
    confidence_level: Math.max(
      0,
      Math.min(100, Math.round(output.confidence_level))
    ),
    reasoning: output.reasoning.trim(),
  }

  // Apply quality-based confidence adjustments
  if (qualityScore < 50) {
    sanitizedOutput.confidence_level = Math.min(
      sanitizedOutput.confidence_level,
      60
    )
    warnings.push('Confidence adjusted down due to low analysis quality')
  }

  if (coherenceScore < 50) {
    sanitizedOutput.confidence_level = Math.min(
      sanitizedOutput.confidence_level,
      70
    )
    warnings.push('Confidence adjusted down due to coherence issues')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    qualityScore,
    coherenceScore,
    sanitizedOutput,
    qualityFlags: allFlags,
  }
}

/**
 * Creates a fallback response for cases where validation fails
 */
export function createFallbackResponse(
  originalMessage: string,
  messageId: string,
  errors: string[]
): any {
  return {
    messageId,
    success: false,
    error: 'Analysis quality validation failed',
    statementType: 'other',
    beliefs: [],
    tradeOffs: [],
    confidenceLevel: 0,
    rawData: {
      originalMessage,
      analysisTimestamp: Date.now(),
      cached: false,
      validationErrors: errors,
      fallbackReason: 'Quality validation failed',
    },
  }
}
