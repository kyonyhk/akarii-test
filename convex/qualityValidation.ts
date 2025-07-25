/**
 * Comprehensive Quality Validation System
 * Advanced scoring rubric and validation rules for analysis quality
 */

import { StructuredOutputFormat } from './promptConfig'
import { EnhancedValidationResult, QualityFlag } from './outputValidation'

export interface QualityRubric {
  dimension: string
  weight: number
  criteria: QualityCriterion[]
}

export interface QualityCriterion {
  name: string
  description: string
  scoreFunction: (analysis: AnalysisQualityInput) => QualityScore
}

export interface QualityScore {
  score: number // 0-100
  flags: QualityFlag[]
  recommendations: string[]
}

export interface AnalysisQualityInput {
  output: StructuredOutputFormat
  originalMessage: string
  context?: string
  metadata?: {
    responseTime?: number
    retryCount?: number
    userId?: string
    conversationId?: string
  }
}

export interface ComprehensiveQualityResult {
  overallScore: number // 0-100
  dimensionScores: Record<string, number>
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  shouldDisplay: boolean
  requiresHumanReview: boolean
  shouldRetry: boolean
  flags: QualityFlag[]
  recommendations: string[]
  confidenceAdjustment: number
}

// Quality thresholds for different actions
export const QUALITY_THRESHOLDS = {
  DISPLAY_MINIMUM: 60, // Don't display below this score
  HUMAN_REVIEW: 70, // Trigger human review for scores below this
  RETRY_THRESHOLD: 40, // Automatically retry analyses below this score
  WARNING_THRESHOLD: 75, // Show warning indicators below this score
  EXCELLENT_THRESHOLD: 90, // Consider excellent quality above this
} as const

// Quality rubric dimensions with weights
export const QUALITY_RUBRIC: QualityRubric[] = [
  {
    dimension: 'content_accuracy',
    weight: 0.25,
    criteria: [
      {
        name: 'statement_type_accuracy',
        description: 'How accurately the statement type is classified',
        scoreFunction: evaluateStatementTypeAccuracy,
      },
      {
        name: 'belief_validity',
        description: 'Whether identified beliefs are plausible and relevant',
        scoreFunction: evaluateBeliefValidity,
      },
      {
        name: 'tradeoff_relevance',
        description: 'Whether trade-offs are actual trade-offs and relevant',
        scoreFunction: evaluateTradeoffRelevance,
      },
    ],
  },
  {
    dimension: 'content_completeness',
    weight: 0.2,
    criteria: [
      {
        name: 'analysis_depth',
        description: 'Thoroughness of the analysis',
        scoreFunction: evaluateAnalysisDepth,
      },
      {
        name: 'belief_coverage',
        description: 'Comprehensiveness of belief identification',
        scoreFunction: evaluateBeliefCoverage,
      },
      {
        name: 'reasoning_quality',
        description: 'Quality of reasoning provided',
        scoreFunction: evaluateReasoningQuality,
      },
    ],
  },
  {
    dimension: 'content_coherence',
    weight: 0.2,
    criteria: [
      {
        name: 'internal_consistency',
        description: 'Logical consistency within the analysis',
        scoreFunction: evaluateInternalConsistency,
      },
      {
        name: 'belief_tradeoff_alignment',
        description: 'How well beliefs and trade-offs relate to each other',
        scoreFunction: evaluateBeliefTradeoffAlignment,
      },
      {
        name: 'reasoning_coherence',
        description: 'Logical flow and coherence of reasoning',
        scoreFunction: evaluateReasoningCoherence,
      },
    ],
  },
  {
    dimension: 'content_specificity',
    weight: 0.15,
    criteria: [
      {
        name: 'concrete_details',
        description: 'Presence of specific, actionable insights',
        scoreFunction: evaluateConcreteDetails,
      },
      {
        name: 'avoidance_of_generics',
        description: 'Avoidance of vague or generic statements',
        scoreFunction: evaluateAvoidanceOfGenerics,
      },
      {
        name: 'contextual_relevance',
        description: 'Relevance to the specific message context',
        scoreFunction: evaluateContextualRelevance,
      },
    ],
  },
  {
    dimension: 'confidence_calibration',
    weight: 0.2,
    criteria: [
      {
        name: 'confidence_accuracy',
        description: 'How well confidence aligns with analysis quality',
        scoreFunction: evaluateConfidenceAccuracy,
      },
      {
        name: 'uncertainty_handling',
        description: 'Appropriate handling of ambiguous cases',
        scoreFunction: evaluateUncertaintyHandling,
      },
      {
        name: 'confidence_justification',
        description: 'Whether confidence level is justified by analysis',
        scoreFunction: evaluateConfidenceJustification,
      },
    ],
  },
]

// Semantic analysis helpers
const VAGUE_INDICATORS = [
  'it depends',
  'various factors',
  'many things',
  'different aspects',
  'several considerations',
  'multiple elements',
  'general approach',
  'typical situation',
  'usually',
  'often',
  'sometimes',
  'might be',
  'could be',
  'possibly',
  'perhaps',
  'maybe',
  'generally',
]

const STRONG_INDICATORS = [
  'specifically',
  'exactly',
  'precisely',
  'concretely',
  'definitively',
  'clearly',
  'explicitly',
  'directly',
  'particularly',
  'notably',
]

const TRADE_OFF_QUALITY_INDICATORS = [
  'vs',
  'versus',
  'against',
  'but',
  'however',
  'although',
  'while',
  'instead of',
  'rather than',
  'either',
  'balance',
  'compromise',
  'sacrifice',
  'cost of',
  'benefit of',
  'downside',
  'upside',
  'pros and cons',
  'trade-off',
  'exchange',
]

// Individual scoring functions
function evaluateStatementTypeAccuracy(
  input: AnalysisQualityInput
): QualityScore {
  const { output, originalMessage } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Check for question markers
  const isQuestion =
    originalMessage.includes('?') ||
    /^(how|what|why|when|where|who|which|should|could|would|can|will|is|are|do|does|did)\b/i.test(
      originalMessage.trim()
    )

  if (isQuestion && output.statement_type !== 'question') {
    score -= 30
    flags.push({
      type: 'consistency',
      severity: 'high',
      description:
        'Message appears to be a question but classified differently',
      suggestion: 'Review statement type classification for questions',
    })
  }

  // Check for opinion markers
  const opinionMarkers = [
    'think',
    'believe',
    'feel',
    'opinion',
    'prefer',
    'like',
    'dislike',
  ]
  const hasOpinionMarkers = opinionMarkers.some(marker =>
    originalMessage.toLowerCase().includes(marker)
  )

  if (hasOpinionMarkers && output.statement_type !== 'opinion') {
    score -= 20
    flags.push({
      type: 'consistency',
      severity: 'medium',
      description:
        'Message contains opinion markers but not classified as opinion',
      suggestion: 'Review for subjective language and personal views',
    })
  }

  // Check for request markers
  const requestMarkers = [
    'please',
    'can you',
    'could you',
    'would you',
    'help me',
    'need you to',
  ]
  const hasRequestMarkers = requestMarkers.some(marker =>
    originalMessage.toLowerCase().includes(marker)
  )

  if (hasRequestMarkers && output.statement_type !== 'request') {
    score -= 25
    flags.push({
      type: 'consistency',
      severity: 'high',
      description:
        'Message contains request language but not classified as request',
      suggestion: 'Look for imperative or asking language patterns',
    })
  }

  if (score < 80) {
    recommendations.push(
      'Review statement type classification training data and examples'
    )
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateBeliefValidity(input: AnalysisQualityInput): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  if (output.beliefs.length === 0) {
    score = 30
    flags.push({
      type: 'completeness',
      severity: 'high',
      description: 'No beliefs identified in analysis',
      suggestion: 'Look for underlying assumptions, values, or worldviews',
    })
    recommendations.push(
      'Analyze what assumptions the person might hold that led to their statement'
    )
  } else {
    // Check belief quality
    output.beliefs.forEach((belief, index) => {
      if (belief.length < 10) {
        score -= 15
        flags.push({
          type: 'completeness',
          severity: 'medium',
          description: `Belief ${index + 1} is too brief to be meaningful`,
          suggestion: 'Expand beliefs with more context and detail',
        })
      }

      // Check for vague language
      const isVague = VAGUE_INDICATORS.some(indicator =>
        belief.toLowerCase().includes(indicator)
      )
      if (isVague) {
        score -= 10
        flags.push({
          type: 'specificity',
          severity: 'low',
          description: `Belief ${index + 1} contains vague language`,
          suggestion:
            'Be more specific about the underlying belief or assumption',
        })
      }

      // Check for repetition with other beliefs
      const otherBeliefs = output.beliefs.filter((_, i) => i !== index)
      const similarity = otherBeliefs.some(
        other =>
          calculateStringSimilarity(belief.toLowerCase(), other.toLowerCase()) >
          0.7
      )
      if (similarity) {
        score -= 10
        flags.push({
          type: 'consistency',
          severity: 'low',
          description: `Belief ${index + 1} is very similar to other identified beliefs`,
          suggestion: 'Identify diverse and distinct underlying beliefs',
        })
      }
    })

    if (output.beliefs.length > 5) {
      score -= 5
      recommendations.push(
        'Focus on the most important 3-5 beliefs rather than listing many'
      )
    }
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateTradeoffRelevance(input: AnalysisQualityInput): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  if (output.trade_offs.length === 0) {
    // Trade-offs might not always be present, so less penalty
    score = 50
    recommendations.push(
      'Consider if there are implicit trade-offs or competing considerations'
    )
  } else {
    output.trade_offs.forEach((tradeoff, index) => {
      // Check if it's actually a trade-off
      const hasTradeoffLanguage = TRADE_OFF_QUALITY_INDICATORS.some(indicator =>
        tradeoff.toLowerCase().includes(indicator)
      )

      if (!hasTradeoffLanguage) {
        score -= 20
        flags.push({
          type: 'specificity',
          severity: 'medium',
          description: `Trade-off ${index + 1} doesn't clearly express a trade-off relationship`,
          suggestion: 'Use language that shows competing options or sacrifices',
        })
      }

      if (tradeoff.length < 15) {
        score -= 10
        flags.push({
          type: 'completeness',
          severity: 'medium',
          description: `Trade-off ${index + 1} lacks sufficient detail`,
          suggestion: 'Explain what is being traded off against what',
        })
      }

      // Check for vague language
      const isVague = VAGUE_INDICATORS.some(indicator =>
        tradeoff.toLowerCase().includes(indicator)
      )
      if (isVague) {
        score -= 8
        flags.push({
          type: 'specificity',
          severity: 'low',
          description: `Trade-off ${index + 1} contains vague language`,
          suggestion: 'Be more specific about the competing alternatives',
        })
      }
    })
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateAnalysisDepth(input: AnalysisQualityInput): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Evaluate reasoning depth
  const reasoningLength = output.reasoning.length
  if (reasoningLength < 50) {
    score -= 30
    flags.push({
      type: 'completeness',
      severity: 'high',
      description: 'Reasoning is too brief for meaningful analysis',
      suggestion: 'Provide more detailed explanation of the analysis process',
    })
  } else if (reasoningLength < 100) {
    score -= 15
    flags.push({
      type: 'completeness',
      severity: 'medium',
      description: 'Reasoning could be more comprehensive',
      suggestion: 'Expand on the analytical process and connections made',
    })
  }

  // Check for analytical depth indicators
  const depthIndicators = [
    'because',
    'therefore',
    'implies',
    'suggests',
    'indicates',
    'leads to',
    'results in',
    'stems from',
    'underlying',
    'fundamental',
    'root cause',
  ]
  const hasDepthIndicators = depthIndicators.some(indicator =>
    output.reasoning.toLowerCase().includes(indicator)
  )

  if (!hasDepthIndicators) {
    score -= 15
    flags.push({
      type: 'completeness',
      severity: 'medium',
      description: 'Reasoning lacks analytical depth indicators',
      suggestion: 'Include causal relationships and deeper connections',
    })
  }

  // Evaluate overall content volume
  const totalContent =
    output.beliefs.join(' ') +
    ' ' +
    output.trade_offs.join(' ') +
    ' ' +
    output.reasoning
  if (totalContent.length < 100) {
    score -= 20
    recommendations.push(
      'Provide more comprehensive analysis across all dimensions'
    )
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateBeliefCoverage(input: AnalysisQualityInput): QualityScore {
  const { output, originalMessage } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Analyze message complexity to determine expected belief count
  const messageWords = originalMessage.split(/\s+/).length
  const messageComplexity =
    messageWords > 30 ? 'high' : messageWords > 15 ? 'medium' : 'low'

  const expectedBeliefRanges = {
    low: { min: 1, max: 2 },
    medium: { min: 2, max: 4 },
    high: { min: 3, max: 5 },
  }

  const expectedRange = expectedBeliefRanges[messageComplexity]
  const beliefCount = output.beliefs.length

  if (beliefCount < expectedRange.min) {
    score -= 25
    flags.push({
      type: 'completeness',
      severity: 'high',
      description: `Expected ${expectedRange.min}-${expectedRange.max} beliefs for message complexity, found ${beliefCount}`,
      suggestion: 'Look for additional underlying assumptions or values',
    })
  } else if (beliefCount > expectedRange.max) {
    score -= 10
    flags.push({
      type: 'consistency',
      severity: 'low',
      description: `More beliefs identified than expected for message complexity`,
      suggestion: 'Focus on the most significant beliefs',
    })
  }

  // Check for belief diversity
  if (beliefCount > 1) {
    const avgSimilarity = calculateBeliefSimilarity(output.beliefs)
    if (avgSimilarity > 0.6) {
      score -= 15
      flags.push({
        type: 'consistency',
        severity: 'medium',
        description: 'Beliefs are too similar to each other',
        suggestion: 'Identify more diverse underlying assumptions',
      })
    }
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateReasoningQuality(input: AnalysisQualityInput): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  const reasoning = output.reasoning.toLowerCase()

  // Check for explanation quality
  const explanationIndicators = [
    'this suggests',
    'this indicates',
    'this means',
    'this implies',
    'evidence of',
    'shown by',
    'demonstrated by',
    'reflected in',
  ]
  const hasExplanations = explanationIndicators.some(indicator =>
    reasoning.includes(indicator)
  )

  if (!hasExplanations) {
    score -= 20
    flags.push({
      type: 'completeness',
      severity: 'medium',
      description: 'Reasoning lacks clear explanatory connections',
      suggestion: 'Explain how you arrived at the analysis conclusions',
    })
  }

  // Check for logical structure
  const logicalConnectors = [
    'first',
    'second',
    'third',
    'additionally',
    'furthermore',
    'moreover',
    'however',
    'nevertheless',
    'therefore',
    'consequently',
    'as a result',
  ]
  const hasStructure = logicalConnectors.some(connector =>
    reasoning.includes(connector)
  )

  if (!hasStructure && output.reasoning.length > 100) {
    score -= 10
    recommendations.push(
      'Use logical connectors to structure the reasoning flow'
    )
  }

  // Check for vague reasoning
  const vagueCount = VAGUE_INDICATORS.reduce(
    (count, indicator) => count + (reasoning.includes(indicator) ? 1 : 0),
    0
  )

  if (vagueCount > 2) {
    score -= 15
    flags.push({
      type: 'specificity',
      severity: 'medium',
      description: 'Reasoning contains too much vague language',
      suggestion: 'Be more specific and concrete in analytical reasoning',
    })
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateInternalConsistency(
  input: AnalysisQualityInput
): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Check consistency between beliefs and statement type
  if (output.statement_type === 'fact' && output.beliefs.length > 0) {
    const hasSubjectiveBeliefs = output.beliefs.some(belief =>
      ['think', 'believe', 'feel', 'prefer'].some(word =>
        belief.toLowerCase().includes(word)
      )
    )

    if (hasSubjectiveBeliefs) {
      score -= 20
      flags.push({
        type: 'consistency',
        severity: 'medium',
        description: 'Subjective beliefs identified for factual statement',
        suggestion: 'Ensure beliefs align with statement type classification',
      })
    }
  }

  // Check reasoning consistency with conclusions
  const reasoningLower = output.reasoning.toLowerCase()
  const beliefWords = output.beliefs.join(' ').toLowerCase()
  const tradeoffWords = output.trade_offs.join(' ').toLowerCase()

  // Simple consistency check: reasoning should mention key concepts from beliefs/tradeoffs
  const keyWords = [
    ...new Set([
      ...beliefWords.split(/\s+/).filter(w => w.length > 4),
      ...tradeoffWords.split(/\s+/).filter(w => w.length > 4),
    ]),
  ].slice(0, 5)

  const mentionedCount = keyWords.filter(word =>
    reasoningLower.includes(word)
  ).length

  if (keyWords.length > 0 && mentionedCount / keyWords.length < 0.3) {
    score -= 15
    flags.push({
      type: 'consistency',
      severity: 'medium',
      description:
        "Reasoning doesn't clearly connect to identified beliefs/trade-offs",
      suggestion:
        'Ensure reasoning explains how beliefs and trade-offs were identified',
    })
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateBeliefTradeoffAlignment(
  input: AnalysisQualityInput
): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  if (output.beliefs.length === 0 || output.trade_offs.length === 0) {
    // Can't evaluate alignment if one is missing
    return { score: 70, flags, recommendations }
  }

  // Calculate semantic overlap between beliefs and trade-offs
  const beliefText = output.beliefs.join(' ').toLowerCase()
  const tradeoffText = output.trade_offs.join(' ').toLowerCase()

  const beliefWords = new Set(beliefText.split(/\s+/).filter(w => w.length > 3))
  const tradeoffWords = new Set(
    tradeoffText.split(/\s+/).filter(w => w.length > 3)
  )

  const intersection = new Set(
    [...beliefWords].filter(x => tradeoffWords.has(x))
  )
  const union = new Set([...beliefWords, ...tradeoffWords])

  const overlapRatio = intersection.size / union.size

  if (overlapRatio < 0.1) {
    score -= 25
    flags.push({
      type: 'coherence',
      severity: 'high',
      description: 'Beliefs and trade-offs appear completely disconnected',
      suggestion:
        'Ensure beliefs and trade-offs relate to the same decision context',
    })
  } else if (overlapRatio < 0.2) {
    score -= 15
    flags.push({
      type: 'coherence',
      severity: 'medium',
      description: 'Weak connection between beliefs and trade-offs',
      suggestion:
        'Look for stronger thematic connections between beliefs and trade-offs',
    })
  }

  // Check if trade-offs actually relate to the belief systems
  const beliefThemes = extractThemes(output.beliefs)
  const tradeoffThemes = extractThemes(output.trade_offs)

  const themeAlignment = calculateThemeAlignment(beliefThemes, tradeoffThemes)
  if (themeAlignment < 0.3) {
    score -= 10
    recommendations.push(
      'Consider how the identified beliefs might create tensions or trade-offs'
    )
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateReasoningCoherence(input: AnalysisQualityInput): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Check for logical flow indicators
  const reasoning = output.reasoning.toLowerCase()
  const contradictionIndicators = [
    'but then',
    'however',
    'on the other hand',
    'contradicts',
    'inconsistent',
  ]

  const hasContradictions = contradictionIndicators.some(indicator =>
    reasoning.includes(indicator)
  )

  if (hasContradictions) {
    // This could be good (acknowledging complexity) or bad (actual contradiction)
    // For now, slight penalty but recommendation to clarify
    score -= 5
    recommendations.push(
      'Clarify apparent contradictions in reasoning or acknowledge complexity'
    )
  }

  // Check for circular reasoning
  const sentences = output.reasoning
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 10)
  if (sentences.length > 1) {
    // Simple check for repetitive concepts
    const conceptOverlap = sentences.map(
      s =>
        new Set(
          s
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 4)
        )
    )

    let maxOverlap = 0
    for (let i = 0; i < conceptOverlap.length - 1; i++) {
      for (let j = i + 1; j < conceptOverlap.length; j++) {
        const intersection = new Set(
          [...conceptOverlap[i]].filter(x => conceptOverlap[j].has(x))
        )
        const overlapRatio =
          intersection.size /
          Math.min(conceptOverlap[i].size, conceptOverlap[j].size)
        maxOverlap = Math.max(maxOverlap, overlapRatio)
      }
    }

    if (maxOverlap > 0.8) {
      score -= 15
      flags.push({
        type: 'consistency',
        severity: 'medium',
        description: 'Reasoning appears circular or repetitive',
        suggestion: 'Provide more varied supporting arguments and evidence',
      })
    }
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateConcreteDetails(input: AnalysisQualityInput): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  const allContent = [...output.beliefs, ...output.trade_offs, output.reasoning]
    .join(' ')
    .toLowerCase()

  // Count strong vs weak indicators
  const strongCount = STRONG_INDICATORS.reduce(
    (count, indicator) => count + (allContent.includes(indicator) ? 1 : 0),
    0
  )

  const vagueCount = VAGUE_INDICATORS.reduce(
    (count, indicator) => count + (allContent.includes(indicator) ? 1 : 0),
    0
  )

  const specificityRatio = strongCount / Math.max(1, strongCount + vagueCount)

  if (specificityRatio < 0.2) {
    score -= 30
    flags.push({
      type: 'specificity',
      severity: 'high',
      description: 'Analysis lacks concrete, specific details',
      suggestion:
        'Include specific examples, precise language, and concrete insights',
    })
  } else if (specificityRatio < 0.4) {
    score -= 15
    flags.push({
      type: 'specificity',
      severity: 'medium',
      description: 'Analysis could be more specific and concrete',
      suggestion: 'Replace vague language with more precise descriptions',
    })
  }

  // Check for actionable insights
  const actionableIndicators = [
    'should',
    'could',
    'might',
    'consider',
    'recommend',
    'suggest',
    'focus on',
    'avoid',
    'prioritize',
    'emphasize',
  ]
  const hasActionableElements = actionableIndicators.some(indicator =>
    allContent.includes(indicator)
  )

  if (!hasActionableElements && output.statement_type !== 'fact') {
    score -= 10
    recommendations.push(
      'Consider including actionable insights or implications'
    )
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateAvoidanceOfGenerics(
  input: AnalysisQualityInput
): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  const allContent = [...output.beliefs, ...output.trade_offs, output.reasoning]
    .join(' ')
    .toLowerCase()

  // Count generic phrases
  const genericCount = VAGUE_INDICATORS.reduce(
    (count, indicator) => count + (allContent.split(indicator).length - 1),
    0
  )

  const contentLength = allContent.split(/\s+/).length
  const genericRatio = genericCount / Math.max(1, contentLength / 20) // Normalize by content length

  if (genericRatio > 0.3) {
    score -= 25
    flags.push({
      type: 'specificity',
      severity: 'high',
      description: 'Analysis contains too many generic phrases',
      suggestion: 'Replace generic language with specific, contextual insights',
    })
  } else if (genericRatio > 0.15) {
    score -= 12
    flags.push({
      type: 'specificity',
      severity: 'medium',
      description: 'Analysis contains several generic phrases',
      suggestion: 'Strive for more specific and unique insights',
    })
  }

  // Check for generic beliefs/tradeoffs
  const genericBeliefs = output.beliefs.filter(belief =>
    VAGUE_INDICATORS.some(indicator => belief.toLowerCase().includes(indicator))
  )

  if (genericBeliefs.length > 0) {
    score -= 10 * genericBeliefs.length
    recommendations.push(
      'Focus on specific, unique beliefs rather than generic assumptions'
    )
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateContextualRelevance(
  input: AnalysisQualityInput
): QualityScore {
  const { output, originalMessage, context } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Check if analysis relates to the original message
  const messageWords = new Set(
    originalMessage
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
  )
  const analysisWords = new Set(
    [
      ...output.beliefs.join(' ').split(/\s+/),
      ...output.trade_offs.join(' ').split(/\s+/),
      ...output.reasoning.split(/\s+/),
    ]
      .map(w => w.toLowerCase())
      .filter(w => w.length > 3)
  )

  const relevanceOverlap = new Set(
    [...messageWords].filter(x => analysisWords.has(x))
  )
  const relevanceRatio = relevanceOverlap.size / Math.max(1, messageWords.size)

  if (relevanceRatio < 0.2) {
    score -= 30
    flags.push({
      type: 'consistency',
      severity: 'high',
      description: "Analysis doesn't clearly relate to the original message",
      suggestion:
        'Ensure analysis directly addresses the content and context of the message',
    })
  } else if (relevanceRatio < 0.4) {
    score -= 15
    flags.push({
      type: 'consistency',
      severity: 'medium',
      description: 'Weak connection between analysis and original message',
      suggestion:
        'Strengthen the connection between message content and analysis',
    })
  }

  // If context is provided, check context integration
  if (context && context.length > 20) {
    const contextWords = new Set(
      context
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
    )
    const contextIntegration = new Set(
      [...contextWords].filter(x => analysisWords.has(x))
    )
    const contextRatio =
      contextIntegration.size / Math.max(1, Math.min(contextWords.size, 10))

    if (contextRatio < 0.1) {
      score -= 10
      recommendations.push(
        'Consider integrating conversation context into the analysis'
      )
    }
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateConfidenceAccuracy(input: AnalysisQualityInput): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Calculate analysis quality proxy
  const hasBeliefs =
    output.beliefs.length > 0 && output.beliefs.some(b => b.length > 10)
  const hasTradeoffs =
    output.trade_offs.length > 0 && output.trade_offs.some(t => t.length > 10)
  const hasReasoning = output.reasoning.length > 50

  const completeness =
    ((hasBeliefs ? 1 : 0) + (hasTradeoffs ? 1 : 0) + (hasReasoning ? 1 : 0)) / 3

  const confidence = output.confidence_level

  // Check for confidence-quality misalignment
  if (confidence > 80 && completeness < 0.7) {
    score -= 30
    flags.push({
      type: 'confidence_mismatch',
      severity: 'high',
      description: 'Very high confidence despite incomplete analysis',
      suggestion: 'Lower confidence when analysis lacks depth or completeness',
    })
  } else if (confidence > 60 && completeness < 0.5) {
    score -= 20
    flags.push({
      type: 'confidence_mismatch',
      severity: 'medium',
      description: 'High confidence despite limited analysis quality',
      suggestion: 'Calibrate confidence to match analysis thoroughness',
    })
  }

  if (confidence < 40 && completeness > 0.8) {
    score -= 15
    flags.push({
      type: 'confidence_mismatch',
      severity: 'medium',
      description: 'Low confidence despite thorough analysis',
      suggestion: 'Consider if confidence is appropriately calibrated',
    })
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateUncertaintyHandling(
  input: AnalysisQualityInput
): QualityScore {
  const { output, originalMessage } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  // Check for uncertainty indicators in message
  const uncertaintyIndicators = [
    'maybe',
    'perhaps',
    'might',
    'could',
    'possibly',
    'not sure',
    'unclear',
    'ambiguous',
    'depends',
    'varies',
  ]

  const messageUncertainty = uncertaintyIndicators.some(indicator =>
    originalMessage.toLowerCase().includes(indicator)
  )

  if (messageUncertainty && output.confidence_level > 70) {
    score -= 20
    flags.push({
      type: 'confidence_mismatch',
      severity: 'medium',
      description: 'High confidence despite uncertainty indicators in message',
      suggestion: 'Reduce confidence when message contains uncertainty',
    })
  }

  // Check if analysis acknowledges uncertainty appropriately
  const analysisText = (
    output.reasoning +
    ' ' +
    output.beliefs.join(' ')
  ).toLowerCase()
  const acknowledgesUncertainty = [
    'uncertain',
    'unclear',
    'ambiguous',
    'depends on',
    'may vary',
    'difficult to determine',
    'not enough information',
  ].some(phrase => analysisText.includes(phrase))

  if (messageUncertainty && !acknowledgesUncertainty) {
    score -= 10
    recommendations.push(
      'Acknowledge uncertainty when present in the original message'
    )
  }

  // Check for overconfidence in ambiguous statement types
  if (output.statement_type === 'other' && output.confidence_level > 75) {
    score -= 10
    flags.push({
      type: 'confidence_mismatch',
      severity: 'low',
      description: 'High confidence for ambiguous statement type',
      suggestion:
        "Consider lower confidence for statements that don't fit clear categories",
    })
  }

  return { score: Math.max(0, score), flags, recommendations }
}

function evaluateConfidenceJustification(
  input: AnalysisQualityInput
): QualityScore {
  const { output } = input
  const flags: QualityFlag[] = []
  const recommendations: string[] = []
  let score = 100

  const reasoning = output.reasoning.toLowerCase()

  // Look for confidence justification language
  const confidenceJustifiers = [
    'clear',
    'obvious',
    'evident',
    'certainly',
    'definitely',
    'strongly suggests',
    'clearly indicates',
    'unambiguous',
    'straightforward',
  ]

  const uncertaintyJustifiers = [
    'somewhat',
    'partially',
    'moderately',
    'tentatively',
    'possibly',
    'may indicate',
    'suggests',
    'implies',
    'could mean',
  ]

  const hasHighConfidenceLanguage = confidenceJustifiers.some(phrase =>
    reasoning.includes(phrase)
  )
  const hasUncertaintyLanguage = uncertaintyJustifiers.some(phrase =>
    reasoning.includes(phrase)
  )

  // Check alignment between language and confidence
  if (output.confidence_level > 80 && !hasHighConfidenceLanguage) {
    score -= 15
    flags.push({
      type: 'confidence_mismatch',
      severity: 'medium',
      description: 'High confidence not reflected in reasoning language',
      suggestion: 'Use language that reflects the stated confidence level',
    })
  }

  if (output.confidence_level < 50 && hasHighConfidenceLanguage) {
    score -= 15
    flags.push({
      type: 'confidence_mismatch',
      severity: 'medium',
      description: 'Low confidence but reasoning uses high-certainty language',
      suggestion: 'Align reasoning language with confidence level',
    })
  }

  if (output.confidence_level < 60 && !hasUncertaintyLanguage) {
    score -= 5
    recommendations.push(
      'Use tentative language when confidence is moderate or low'
    )
  }

  return { score: Math.max(0, score), flags, recommendations }
}

// Helper functions
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/))
  const words2 = new Set(str2.split(/\s+/))
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  return union.size > 0 ? intersection.size / union.size : 0
}

function calculateBeliefSimilarity(beliefs: string[]): number {
  if (beliefs.length < 2) return 0

  let totalSimilarity = 0
  let comparisons = 0

  for (let i = 0; i < beliefs.length - 1; i++) {
    for (let j = i + 1; j < beliefs.length; j++) {
      totalSimilarity += calculateStringSimilarity(
        beliefs[i].toLowerCase(),
        beliefs[j].toLowerCase()
      )
      comparisons++
    }
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0
}

function extractThemes(items: string[]): string[] {
  // Simple theme extraction - in a real implementation, this could use NLP
  const themes: string[] = []
  const commonThemes = [
    'efficiency',
    'quality',
    'cost',
    'time',
    'security',
    'privacy',
    'convenience',
    'reliability',
    'performance',
    'user experience',
    'sustainability',
    'innovation',
    'tradition',
    'change',
    'stability',
  ]

  const allText = items.join(' ').toLowerCase()
  commonThemes.forEach(theme => {
    if (allText.includes(theme)) {
      themes.push(theme)
    }
  })

  return themes
}

function calculateThemeAlignment(themes1: string[], themes2: string[]): number {
  if (themes1.length === 0 || themes2.length === 0) return 0

  const set1 = new Set(themes1)
  const set2 = new Set(themes2)
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Main comprehensive quality evaluation function
 */
export function evaluateAnalysisQuality(
  input: AnalysisQualityInput
): ComprehensiveQualityResult {
  const dimensionScores: Record<string, number> = {}
  const allFlags: QualityFlag[] = []
  const allRecommendations: string[] = []

  // Evaluate each dimension
  let weightedScore = 0
  for (const rubric of QUALITY_RUBRIC) {
    let dimensionScore = 0
    const criteriaCount = rubric.criteria.length

    for (const criterion of rubric.criteria) {
      const result = criterion.scoreFunction(input)
      dimensionScore += result.score
      allFlags.push(...result.flags)
      allRecommendations.push(...result.recommendations)
    }

    dimensionScore = dimensionScore / criteriaCount
    dimensionScores[rubric.dimension] = Math.round(dimensionScore)
    weightedScore += dimensionScore * rubric.weight
  }

  const overallScore = Math.round(weightedScore)

  // Determine quality grade
  let qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  if (overallScore >= 90) qualityGrade = 'A'
  else if (overallScore >= 80) qualityGrade = 'B'
  else if (overallScore >= 70) qualityGrade = 'C'
  else if (overallScore >= 60) qualityGrade = 'D'
  else qualityGrade = 'F'

  // Make decisions based on quality
  const shouldDisplay = overallScore >= QUALITY_THRESHOLDS.DISPLAY_MINIMUM
  const requiresHumanReview = overallScore < QUALITY_THRESHOLDS.HUMAN_REVIEW
  const shouldRetry = overallScore < QUALITY_THRESHOLDS.RETRY_THRESHOLD

  // Calculate confidence adjustment
  let confidenceAdjustment = 0
  if (overallScore < 70) {
    confidenceAdjustment = -Math.round((70 - overallScore) * 0.5)
  }

  return {
    overallScore,
    dimensionScores,
    qualityGrade,
    shouldDisplay,
    requiresHumanReview,
    shouldRetry,
    flags: allFlags,
    recommendations: [...new Set(allRecommendations)], // Remove duplicates
    confidenceAdjustment,
  }
}
