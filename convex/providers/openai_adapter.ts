'use node'

import OpenAI from 'openai'
import { AIProvider, MODEL_CONFIGS } from '../ai'
import { countChatTokens, countTokens } from '../token_utils'

export class OpenAIAdapter implements AIProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async generate(params: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
    model: string
    maxTokens?: number
    temperature?: number
    responseFormat?: { type: 'json_object' | 'text' }
    timeout?: number
  }) {
    try {
      // Validate that this is an OpenAI model
      const modelConfig = MODEL_CONFIGS[params.model]
      if (!modelConfig || modelConfig.provider !== 'openai') {
        throw new Error(
          `Model ${params.model} is not supported by OpenAI provider`
        )
      }

      // Count input tokens
      const inputTokens = countChatTokens(params.messages)

      // Call OpenAI API
      const response = await this.client.chat.completions.create(
        {
          model: params.model,
          messages: params.messages,
          max_tokens: params.maxTokens || modelConfig.maxTokens,
          temperature: params.temperature ?? 0.1,
          response_format: params.responseFormat || { type: 'text' },
        },
        {
          timeout: params.timeout || 8000,
        }
      )

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response received from OpenAI')
      }

      // Extract token usage from API response or calculate fallback
      const apiUsage = response.usage
      const outputTokens = apiUsage?.completion_tokens || countTokens(content)
      const totalTokens = apiUsage?.total_tokens || inputTokens + outputTokens

      return {
        content,
        usage: {
          inputTokens: apiUsage?.prompt_tokens || inputTokens,
          outputTokens,
          totalTokens,
        },
        model: params.model,
      }
    } catch (error) {
      console.error('OpenAI generation failed:', error)
      throw error
    }
  }

  validateConfig(): boolean {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not set')
      return false
    }

    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error(
        'OPENAI_API_KEY appears to be invalid (should start with sk-)'
      )
      return false
    }

    return true
  }

  getSupportedModels(): string[] {
    return Object.entries(MODEL_CONFIGS)
      .filter(([, config]) => config.provider === 'openai')
      .map(([modelId]) => modelId)
  }

  calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string
  ): number {
    const config = MODEL_CONFIGS[model]
    if (!config || config.provider !== 'openai') {
      throw new Error(`Model ${model} is not supported by OpenAI provider`)
    }

    const inputCost = (inputTokens / 1000) * config.costPer1kInputTokens
    const outputCost = (outputTokens / 1000) * config.costPer1kOutputTokens

    return inputCost + outputCost
  }
}
