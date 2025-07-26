'use node'

import { action, ActionCtx } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

// Refactored analysis action using the new AI adapter pattern
export const analyzeMessageWithAdapter = action({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args) => {
    try {
      const model = args.model || 'gpt-4o' // Default to GPT-4o

      // Simple system and user prompts for basic analysis
      const messages = [
        {
          role: 'system' as const,
          content:
            'You are an AI assistant that analyzes messages. Respond with a JSON object containing: {"analysis": "your analysis", "sentiment": "positive|negative|neutral", "key_points": ["point1", "point2"]}',
        },
        {
          role: 'user' as const,
          content: `Please analyze this message: "${args.content}"`,
        },
      ]

      // Use the new AI adapter system
      const result = await ctx.runAction(api.ai.generate, {
        messages,
        model,
        maxTokens: 500,
        temperature: 0.1,
        responseFormat: { type: 'json_object' },
        timeout: 8000,
      })

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          messageId: args.messageId,
        }
      }

      // Parse the JSON response
      let analysisData
      try {
        analysisData = JSON.parse(result.content)
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse AI response as JSON',
          messageId: args.messageId,
        }
      }

      return {
        success: true,
        messageId: args.messageId,
        analysis: analysisData.analysis || 'No analysis provided',
        sentiment: analysisData.sentiment || 'neutral',
        keyPoints: analysisData.key_points || [],
        usage: result.usage,
        model: result.model,
      }
    } catch (error) {
      console.error('Analysis with adapter failed:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        messageId: args.messageId,
      }
    }
  },
})

// Test action to verify the adapter pattern works
export const testAdapterPattern = action({
  args: {
    testMessage: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args) => {
    try {
      const model = args.model || 'gpt-4o'

      console.log(`Testing adapter pattern with model: ${model}`)

      // Test the new AI generation action
      const result = await ctx.runAction(api.ai.generate, {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant. Respond with "Hello from AI adapter!" and include the test message.',
          },
          {
            role: 'user',
            content: args.testMessage,
          },
        ],
        model,
        maxTokens: 100,
        temperature: 0.1,
      })

      console.log('AI adapter test result:', result)

      return {
        success: result.success,
        content: result.content,
        model: result.model,
        usage: result.usage,
        error: result.error,
      }
    } catch (error) {
      console.error('Adapter pattern test failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      }
    }
  },
})
