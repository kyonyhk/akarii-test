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

/**
 * More accurate token counting using tiktoken for GPT models
 * Note: This is a fallback implementation for Convex server environment
 */
export function countTokensAccurate(text: string, model: string = 'gpt-4o'): number {
  // For server environment, use the approximation method
  // In a full implementation, you'd use tiktoken here
  return countTokens(text)
}

/**
 * Truncate conversation history to fit within context limits
 */
export function truncateConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  preserveRecentCount: number = 3
): {
  truncatedMessages: Array<{ role: string; content: string }>
  removedCount: number
  finalTokenCount: number
} {
  if (messages.length === 0) {
    return {
      truncatedMessages: [],
      removedCount: 0,
      finalTokenCount: 0,
    }
  }

  // Always preserve system message if it exists
  const systemMessage = messages[0]?.role === 'system' ? messages[0] : null
  const nonSystemMessages = systemMessage ? messages.slice(1) : messages

  // Calculate initial token count
  let totalTokens = countChatTokens(messages)

  if (totalTokens <= maxTokens) {
    return {
      truncatedMessages: messages,
      removedCount: 0,
      finalTokenCount: totalTokens,
    }
  }

  // Start with recent messages and system message
  const preservedMessages = nonSystemMessages.slice(-preserveRecentCount)
  let workingMessages = systemMessage ? [systemMessage, ...preservedMessages] : preservedMessages
  let currentTokens = countChatTokens(workingMessages)

  // Add older messages until we reach the limit
  let addIndex = nonSystemMessages.length - preserveRecentCount - 1
  while (addIndex >= 0 && currentTokens < maxTokens) {
    const candidateMessage = nonSystemMessages[addIndex]
    const candidateMessages = systemMessage 
      ? [systemMessage, candidateMessage, ...preservedMessages]
      : [candidateMessage, ...preservedMessages]
    
    const candidateTokens = countChatTokens(candidateMessages)
    
    if (candidateTokens <= maxTokens) {
      workingMessages = candidateMessages
      currentTokens = candidateTokens
      addIndex--
    } else {
      break
    }
  }

  const removedCount = (systemMessage ? nonSystemMessages.length : messages.length) - (workingMessages.length - (systemMessage ? 1 : 0))

  return {
    truncatedMessages: workingMessages,
    removedCount,
    finalTokenCount: currentTokens,
  }
}

/**
 * Smart context window management for conversational AI
 */
export function manageConversationContext(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  currentMessage: string,
  model: string = 'gpt-4o',
  maxOutputTokens: number = 300
): {
  messages: Array<{ role: string; content: string }>
  tokenBreakdown: {
    systemTokens: number
    historyTokens: number
    currentMessageTokens: number
    totalInputTokens: number
    remainingTokens: number
  }
  truncated: boolean
  removedMessages: number
} {
  // Model context limits (conservative estimates)
  const contextLimits: Record<string, number> = {
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 16384,
  }

  const maxContextTokens = contextLimits[model] || 128000
  const maxInputTokens = maxContextTokens - maxOutputTokens - 100 // Safety buffer

  // Count tokens for each component
  const systemTokens = countTokens(systemPrompt)
  const currentMessageTokens = countTokens(currentMessage)

  // Calculate available tokens for history
  const reservedTokens = systemTokens + currentMessageTokens
  const availableForHistory = maxInputTokens - reservedTokens

  if (availableForHistory <= 0) {
    // System prompt and current message alone exceed limits
    return {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentMessage }
      ],
      tokenBreakdown: {
        systemTokens,
        historyTokens: 0,
        currentMessageTokens,
        totalInputTokens: systemTokens + currentMessageTokens,
        remainingTokens: maxInputTokens - systemTokens - currentMessageTokens,
      },
      truncated: true,
      removedMessages: conversationHistory.length,
    }
  }

  // Truncate history to fit
  const truncationResult = truncateConversationHistory(
    conversationHistory,
    availableForHistory,
    3 // Preserve last 3 messages
  )

  // Build final message array
  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...truncationResult.truncatedMessages,
    { role: 'user', content: currentMessage }
  ]

  const totalInputTokens = systemTokens + truncationResult.finalTokenCount + currentMessageTokens

  return {
    messages: finalMessages,
    tokenBreakdown: {
      systemTokens,
      historyTokens: truncationResult.finalTokenCount,
      currentMessageTokens,
      totalInputTokens,
      remainingTokens: maxInputTokens - totalInputTokens,
    },
    truncated: truncationResult.removedCount > 0,
    removedMessages: truncationResult.removedCount,
  }
}
