'use node'

// OpenAI pricing per 1M tokens (as of 2024)
const PRICING = {
  'gpt-4o-mini': {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.6, // $0.60 per 1M output tokens
  },
  'gpt-4': {
    input: 30.0, // $30.00 per 1M input tokens
    output: 60.0, // $60.00 per 1M output tokens
  },
  'gpt-4-turbo': {
    input: 10.0, // $10.00 per 1M input tokens
    output: 30.0, // $30.00 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.5, // $0.50 per 1M input tokens
    output: 1.5, // $1.50 per 1M output tokens
  },
} as const

export type SupportedModel = keyof typeof PRICING

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
  const modelKey = model as SupportedModel
  const pricing = PRICING[modelKey]

  if (!pricing) {
    console.warn(`Unknown model: ${model}, using gpt-4o-mini pricing`)
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
