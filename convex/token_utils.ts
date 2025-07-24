'use node'

// OpenAI pricing per 1M tokens (as of 2025)
const PRICING = {
  'gpt-4o': {
    input: 5.0, // $5.00 per 1M input tokens
    output: 20.0, // $20.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15, // $0.15 per 1M input tokens (60% cheaper than gpt-4o)
    output: 0.6, // $0.60 per 1M output tokens
  },
  'gpt-4': {
    input: 30.0, // $30.00 per 1M input tokens
    output: 60.0, // $60.00 per 1M output tokens
  },
  'gpt-4-32k': {
    input: 60.0, // $60.00 per 1M input tokens
    output: 120.0, // $120.00 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.0, // $10.00 per 1M input tokens
    output: 30.0, // $30.00 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.5, // $0.50 per 1M input tokens
    output: 1.5, // $1.50 per 1M output tokens
  },
  'gpt-3.5-turbo-0125': {
    input: 0.5, // $0.50 per 1M input tokens
    output: 1.5, // $1.50 per 1M output tokens
  },
} as const

export type SupportedModel = keyof typeof PRICING

/**
 * Get all supported models
 */
export function getSupportedModels(): SupportedModel[] {
  return Object.keys(PRICING) as SupportedModel[]
}

/**
 * Check if a model is supported
 */
export function isModelSupported(model: string): model is SupportedModel {
  return model in PRICING
}

/**
 * Get pricing information for a specific model
 */
export function getModelPricing(
  model: string
): { input: number; output: number } | null {
  const modelKey = model as SupportedModel
  return PRICING[modelKey] || null
}

/**
 * Count tokens in a text string using a simple estimation
 * This is a rough approximation: 1 token ≈ 4 characters for English text
 * For more accurate counting, the OpenAI API usage data should be preferred
 */
export function countTokens(text: string): number {
  // Simple token estimation based on character count
  // This is approximate but works when OpenAI API usage data is not available
  return Math.ceil(text.length / 4)
}

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  // Validate inputs
  if (inputTokens < 0 || outputTokens < 0) {
    throw new Error('Token counts cannot be negative')
  }

  const pricing = getModelPricing(model)

  if (!pricing) {
    console.warn(
      `Unknown model: ${model}, using gpt-4o-mini pricing as fallback`
    )
    const fallbackPricing = PRICING['gpt-4o-mini']
    return (
      (inputTokens * fallbackPricing.input) / 1_000_000 +
      (outputTokens * fallbackPricing.output) / 1_000_000
    )
  }

  return (
    (inputTokens * pricing.input) / 1_000_000 +
    (outputTokens * pricing.output) / 1_000_000
  )
}

/**
 * Calculate cost breakdown with detailed information
 */
export function calculateCostBreakdown(
  inputTokens: number,
  outputTokens: number,
  model: string
): {
  inputCost: number
  outputCost: number
  totalCost: number
  pricing: { input: number; output: number }
  model: string
  usedFallback: boolean
} {
  // Validate inputs
  if (inputTokens < 0 || outputTokens < 0) {
    throw new Error('Token counts cannot be negative')
  }

  const pricing = getModelPricing(model)
  const usedFallback = !pricing
  const actualPricing = pricing || PRICING['gpt-4o-mini']

  if (usedFallback) {
    console.warn(
      `Unknown model: ${model}, using gpt-4o-mini pricing as fallback`
    )
  }

  const inputCost = (inputTokens * actualPricing.input) / 1_000_000
  const outputCost = (outputTokens * actualPricing.output) / 1_000_000
  const totalCost = inputCost + outputCost

  return {
    inputCost,
    outputCost,
    totalCost,
    pricing: actualPricing,
    model,
    usedFallback,
  }
}

/**
 * Count tokens in an array of OpenAI chat messages
 */
export function countChatTokens(
  messages: Array<{ role: string; content: string }>
): number {
  // Each message has a small overhead (role, formatting, etc.)
  const MESSAGE_OVERHEAD = 4

  return messages.reduce((total, message) => {
    return total + countTokens(message.content) + MESSAGE_OVERHEAD
  }, 0)
}

/**
 * Create a usage tracking record
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  model: string
  timestamp: number
}

export function createTokenUsage(
  inputTokens: number,
  outputTokens: number,
  model: string
): TokenUsage {
  const totalTokens = inputTokens + outputTokens
  const cost = calculateCost(inputTokens, outputTokens, model)

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cost,
    model,
    timestamp: Date.now(),
  }
}

/**
 * Extract token usage from OpenAI API response
 */
export function extractTokenUsageFromResponse(response: any): {
  inputTokens: number
  outputTokens: number
} {
  const usage = response.usage
  if (usage) {
    return {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
    }
  }

  // Fallback if usage info is not available
  console.warn('No usage information in OpenAI response')
  return {
    inputTokens: 0,
    outputTokens: 0,
  }
}

/**
 * Estimate cost for a chat completion request before making the API call
 */
export function estimateChatCost(
  messages: Array<{ role: string; content: string }>,
  model: string,
  maxTokens?: number
): {
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedInputCost: number
  estimatedOutputCost: number
  estimatedTotalCost: number
  maxPossibleCost: number
} {
  const estimatedInputTokens = countChatTokens(messages)
  const estimatedOutputTokens = maxTokens || 150 // Default estimation for output

  const breakdown = calculateCostBreakdown(
    estimatedInputTokens,
    estimatedOutputTokens,
    model
  )

  // Calculate max possible cost if maxTokens is specified
  const maxOutputTokens = maxTokens || 4096 // Use model's max or reasonable default
  const maxBreakdown = calculateCostBreakdown(
    estimatedInputTokens,
    maxOutputTokens,
    model
  )

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedInputCost: breakdown.inputCost,
    estimatedOutputCost: breakdown.outputCost,
    estimatedTotalCost: breakdown.totalCost,
    maxPossibleCost: maxBreakdown.totalCost,
  }
}

/**
 * Compare costs between different models for the same request
 */
export function compareModelCosts(
  inputTokens: number,
  outputTokens: number,
  models: string[]
): Array<{
  model: string
  cost: number
  breakdown: ReturnType<typeof calculateCostBreakdown>
}> {
  return models
    .map(model => ({
      model,
      cost: calculateCost(inputTokens, outputTokens, model),
      breakdown: calculateCostBreakdown(inputTokens, outputTokens, model),
    }))
    .sort((a, b) => a.cost - b.cost) // Sort by cost, cheapest first
}
