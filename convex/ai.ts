'use node'

import { action, ActionCtx } from './_generated/server'
import { v } from 'convex/values'

// Common interface for all AI providers
export interface AIProvider {
  generate(params: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
    model: string
    maxTokens?: number
    temperature?: number
    responseFormat?: { type: 'json_object' | 'text' }
    timeout?: number
  }): Promise<{
    content: string
    usage: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
    }
    model: string
  }>

  validateConfig(): boolean
  getSupportedModels(): string[]
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string
  ): number
}

// Provider types supported by the system
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'mistral'

// Model configuration mapping
export interface ModelConfig {
  provider: ProviderType
  modelId: string
  displayName: string
  maxTokens: number
  costPer1kInputTokens: number
  costPer1kOutputTokens: number
}

// Default model configurations
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gpt-4o': {
    provider: 'openai',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 4096,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    maxTokens: 16384,
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
  },
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    displayName: 'Claude 3.5 Sonnet',
    maxTokens: 8192,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
  },
  'gemini-1.5-pro': {
    provider: 'google',
    modelId: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    maxTokens: 8192,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
  },
  'mistral-large-latest': {
    provider: 'mistral',
    modelId: 'mistral-large-latest',
    displayName: 'Mistral Large',
    maxTokens: 8192,
    costPer1kInputTokens: 0.004,
    costPer1kOutputTokens: 0.012,
  },
}

// Registry to hold provider instances
const providerRegistry = new Map<ProviderType, AIProvider>()

// Register a provider implementation
export function registerProvider(type: ProviderType, provider: AIProvider) {
  providerRegistry.set(type, provider)
}

// Initialize providers (automatically register available providers)
function initializeProviders() {
  // Lazy import and register OpenAI adapter
  try {
    // Use dynamic import for better ESM compatibility
    const openaiModule = require('./providers/openai_adapter')
    const { OpenAIAdapter } = openaiModule
    const openaiAdapter = new OpenAIAdapter()
    if (openaiAdapter.validateConfig()) {
      registerProvider('openai', openaiAdapter)
      console.log('OpenAI provider registered successfully')
    } else {
      console.warn('OpenAI provider available but not configured')
    }
  } catch (error: any) {
    console.warn(
      'OpenAI provider not available:',
      error?.message || 'Unknown error'
    )
  }

  // TODO: Add other providers (Anthropic, Google, Mistral) here
  // when they are implemented
}

// Initialize providers on module load
initializeProviders()

// Get provider for a specific model
export function getProviderForModel(model: string): AIProvider {
  const config = MODEL_CONFIGS[model]
  if (!config) {
    throw new Error(`Unsupported model: ${model}`)
  }

  const provider = providerRegistry.get(config.provider)
  if (!provider) {
    throw new Error(
      `Provider ${config.provider} not registered for model ${model}`
    )
  }

  return provider
}

// Main AI generation action that uses the adapter pattern
export const generate = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(
          v.literal('system'),
          v.literal('user'),
          v.literal('assistant')
        ),
        content: v.string(),
      })
    ),
    model: v.string(),
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()),
    responseFormat: v.optional(
      v.object({
        type: v.union(v.literal('json_object'), v.literal('text')),
      })
    ),
    timeout: v.optional(v.number()),
  },
  handler: async (ctx: ActionCtx, args) => {
    try {
      // Get the appropriate provider for the requested model
      const provider = getProviderForModel(args.model)

      // Validate that the provider is properly configured
      if (!provider.validateConfig()) {
        throw new Error(
          `Provider for model ${args.model} is not properly configured`
        )
      }

      // Call the provider's generate method
      const result = await provider.generate({
        messages: args.messages,
        model: args.model,
        maxTokens: args.maxTokens,
        temperature: args.temperature,
        responseFormat: args.responseFormat,
        timeout: args.timeout,
      })

      return {
        success: true,
        content: result.content,
        usage: result.usage,
        model: result.model,
      }
    } catch (error) {
      console.error('AI generation failed:', error)

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        content: '',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        model: args.model,
      }
    }
  },
})

// Utility action to get available models
export const getAvailableModels = action({
  args: {},
  handler: async (_ctx: ActionCtx) => {
    const models = Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
      id: key,
      displayName: config.displayName,
      provider: config.provider,
      maxTokens: config.maxTokens,
      costPer1kInputTokens: config.costPer1kInputTokens,
      costPer1kOutputTokens: config.costPer1kOutputTokens,
    }))

    return {
      success: true,
      models,
    }
  },
})

// Utility action to get provider status
export const getProviderStatus = action({
  args: {},
  handler: async (_ctx: ActionCtx) => {
    const status: Record<
      ProviderType,
      { registered: boolean; configured: boolean }
    > = {
      openai: { registered: false, configured: false },
      anthropic: { registered: false, configured: false },
      google: { registered: false, configured: false },
      mistral: { registered: false, configured: false },
    }

    for (const [providerType, provider] of providerRegistry.entries()) {
      status[providerType] = {
        registered: true,
        configured: provider.validateConfig(),
      }
    }

    return {
      success: true,
      providers: status,
    }
  },
})
