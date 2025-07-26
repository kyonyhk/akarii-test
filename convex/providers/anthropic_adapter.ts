'use node'

import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, MODEL_CONFIGS } from '../ai'
import { countChatTokens, countTokens } from '../token_utils'

export class AnthropicAdapter implements AIProvider {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
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
      // Validate that this is an Anthropic model
      const modelConfig = MODEL_CONFIGS[params.model]
      if (!modelConfig || modelConfig.provider !== 'anthropic') {
        throw new Error(
          `Model ${params.model} is not supported by Anthropic provider`
        )
      }

      // Count input tokens
      const inputTokens = countChatTokens(params.messages)

      // Convert OpenAI-style messages to Anthropic format
      const { systemMessage, conversationMessages } = this.convertMessages(
        params.messages
      )

      // Prepare the request parameters
      const requestParams: Anthropic.MessageCreateParams = {
        model: params.model,
        messages: conversationMessages,
        max_tokens: params.maxTokens || modelConfig.maxTokens,
        temperature: params.temperature ?? 0.1,
      }

      // Add system message if present
      if (systemMessage) {
        requestParams.system = systemMessage
      }

      // Call Anthropic API
      const response = await this.client.messages.create(requestParams)

      // Extract content from response
      const content = this.extractContent(response)
      if (!content) {
        throw new Error('No response received from Anthropic')
      }

      // Extract token usage from API response or calculate fallback
      const apiUsage = response.usage
      const outputTokens = apiUsage?.output_tokens || countTokens(content)
      const totalTokens = apiUsage
        ? apiUsage.input_tokens + apiUsage.output_tokens
        : inputTokens + outputTokens

      return {
        content,
        usage: {
          inputTokens: apiUsage?.input_tokens || inputTokens,
          outputTokens,
          totalTokens,
        },
        model: params.model,
      }
    } catch (error) {
      console.error('Anthropic generation failed:', error)
      throw error
    }
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
   * Anthropic expects system messages separately from conversation messages
   */
  private convertMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ) {
    let systemMessage = ''
    const conversationMessages: Anthropic.MessageParam[] = []

    for (const message of messages) {
      if (message.role === 'system') {
        // Accumulate system messages
        systemMessage += (systemMessage ? '\n\n' : '') + message.content
      } else {
        // Add user and assistant messages to conversation
        conversationMessages.push({
          role: message.role,
          content: message.content,
        })
      }
    }

    return {
      systemMessage: systemMessage || undefined,
      conversationMessages,
    }
  }

  /**
   * Extract text content from Anthropic response
   */
  private extractContent(response: Anthropic.Message): string {
    if (response.content && response.content.length > 0) {
      const textBlock = response.content.find(block => block.type === 'text')
      if (textBlock && 'text' in textBlock) {
        return textBlock.text
      }
    }
    return ''
  }

  validateConfig(): boolean {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY environment variable is not set')
      return false
    }

    if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      console.error(
        'ANTHROPIC_API_KEY appears to be invalid (should start with sk-ant-)'
      )
      return false
    }

    return true
  }

  getSupportedModels(): string[] {
    return Object.entries(MODEL_CONFIGS)
      .filter(([, config]) => config.provider === 'anthropic')
      .map(([modelId]) => modelId)
  }

  calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string
  ): number {
    const config = MODEL_CONFIGS[model]
    if (!config || config.provider !== 'anthropic') {
      throw new Error(`Model ${model} is not supported by Anthropic provider`)
    }

    const inputCost = (inputTokens / 1000) * config.costPer1kInputTokens
    const outputCost = (outputTokens / 1000) * config.costPer1kOutputTokens

    return inputCost + outputCost
  }
}
