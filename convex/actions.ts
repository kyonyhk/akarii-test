'use node'

import { action } from './_generated/server'
import { v } from 'convex/values'
import {
  openai,
  ANALYSIS_MODEL,
  MAX_TOKENS,
  TEMPERATURE,
  validateOpenAIConfig,
} from './openai'
import { AnalysisResponse, OpenAIAnalysisResponse } from '../types/analysis'
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT_TEMPLATE,
} from './prompts'
import {
  parseAnalysisResponse,
  withRetry,
  createPerformanceTracker,
  isRetryableError,
  getCachedAnalysis,
  setCachedAnalysis,
  recordAnalysisMetrics,
  getPerformanceMetrics,
} from './analysis_utils'
import {
  countChatTokens,
  countTokens,
  createTokenUsage,
  extractTokenUsageFromResponse,
} from './token_utils'
import { api } from './_generated/api'

// Action to analyze a message using OpenAI
export const analyzeMessage = action({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
  },
  handler: async (ctx, args): Promise<AnalysisResponse> => {
    const tracker = createPerformanceTracker()

    try {
      // Validate OpenAI configuration
      if (!validateOpenAIConfig()) {
        throw new Error('OpenAI API is not properly configured')
      }

      // Check cache first for performance optimization
      const cachedResult = getCachedAnalysis(args.content)
      if (cachedResult) {
        console.log(
          `Cache hit for message ${args.messageId} (${tracker.getElapsedMs()}ms)`
        )

        // Record cache hit metrics
        recordAnalysisMetrics(tracker.getElapsedMs(), true, true)

        const analysis: AnalysisResponse = {
          messageId: args.messageId,
          success: true,
          statementType: cachedResult.statement_type,
          beliefs: cachedResult.beliefs,
          tradeOffs: cachedResult.trade_offs,
          confidenceLevel: cachedResult.confidence_level,
          rawData: {
            originalMessage: args.content,
            analysisTimestamp: Date.now(),
            modelUsed: ANALYSIS_MODEL,
            processingTimeMs: tracker.getElapsedMs(),
            cached: true,
          },
        }
        return analysis
      }

      // Prepare messages for token counting
      const messages = [
        {
          role: 'system' as const,
          content: ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user' as const,
          content: ANALYSIS_USER_PROMPT_TEMPLATE(args.content),
        },
      ]

      // Count input tokens
      const inputTokens = countChatTokens(messages)

      // Make OpenAI API call with enhanced retry logic and error handling
      const { analysisResult, tokenUsage } = await withRetry(
        async () => {
          // Check timeout (target: sub-2-second)
          tracker.checkTimeout(1800) // Leave 200ms buffer

          try {
            const response = await openai.chat.completions.create(
              {
                model: ANALYSIS_MODEL,
                messages,
                max_tokens: MAX_TOKENS,
                temperature: TEMPERATURE,
                response_format: { type: 'json_object' },
              },
              {
                timeout: 1500, // 1.5 second timeout per request
              }
            )

            const openaiResponse = response.choices[0]?.message?.content
            if (!openaiResponse) {
              throw new Error('No response received from OpenAI')
            }

            // Extract token usage from API response
            const apiTokenUsage = extractTokenUsageFromResponse(response)

            // Create token usage record
            const tokenUsage = createTokenUsage(
              apiTokenUsage.inputTokens || inputTokens, // Use API data if available, fallback to our count
              apiTokenUsage.outputTokens || countTokens(openaiResponse), // Use API data if available, fallback to our count
              ANALYSIS_MODEL
            )

            // Parse and validate the response
            const analysisResult = parseAnalysisResponse(openaiResponse)

            return { analysisResult, tokenUsage }
          } catch (error) {
            // Check if this error should be retried
            if (!isRetryableError(error)) {
              console.log(
                `Non-retryable error detected, failing immediately: ${error}`
              )
              throw error
            }

            // Re-throw retryable errors to trigger retry logic
            throw error
          }
        },
        3,
        750
      ) // Max 3 retries, 750ms base delay for better rate limit handling

      // Record token usage in database
      try {
        await ctx.runMutation(api.usage_tracking.recordUsage, {
          messageId: args.messageId,
          userId: args.userId,
          model: ANALYSIS_MODEL,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          totalTokens: tokenUsage.totalTokens,
          cost: tokenUsage.cost,
          operationType: 'analysis',
        })
      } catch (usageError) {
        console.error('Failed to record token usage:', usageError)
        // Continue execution even if usage recording fails
      }

      // Cache the successful result for future use
      setCachedAnalysis(args.content, analysisResult)

      // Convert to our response format
      const analysis: AnalysisResponse = {
        messageId: args.messageId,
        success: true,
        statementType: analysisResult.statement_type,
        beliefs: analysisResult.beliefs,
        tradeOffs: analysisResult.trade_offs,
        confidenceLevel: analysisResult.confidence_level,
        rawData: {
          originalMessage: args.content,
          analysisTimestamp: Date.now(),
          modelUsed: ANALYSIS_MODEL,
          processingTimeMs: tracker.getElapsedMs(),
          cached: false,
          tokenUsage: {
            inputTokens: tokenUsage.inputTokens,
            outputTokens: tokenUsage.outputTokens,
            totalTokens: tokenUsage.totalTokens,
            cost: tokenUsage.cost,
          },
        },
      }

      // Record performance metrics
      recordAnalysisMetrics(tracker.getElapsedMs(), false, true)

      console.log(
        `Analysis completed for message ${args.messageId} in ${tracker.getElapsedMs()}ms`
      )
      return analysis
    } catch (error) {
      console.error('Error analyzing message:', error)

      // Record failure metrics
      recordAnalysisMetrics(tracker.getElapsedMs(), false, false)

      return {
        messageId: args.messageId,
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        statementType: 'other',
        beliefs: [],
        tradeOffs: [],
        confidenceLevel: 0,
        rawData: {
          originalMessage: args.content,
          analysisTimestamp: Date.now(),
          modelUsed: ANALYSIS_MODEL,
          processingTimeMs: tracker.getElapsedMs(),
          cached: false,
        },
      }
    }
  },
})

// Test action to verify OpenAI connectivity
export const testOpenAIConnection = action({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; error?: string; tokenUsage?: any }> => {
    try {
      if (!validateOpenAIConfig()) {
        return { success: false, error: 'OpenAI API key not configured' }
      }

      const messages = [
        {
          role: 'system' as const,
          content:
            'You are a test assistant. Respond with "OK" if you can receive this message.',
        },
        {
          role: 'user' as const,
          content: 'Test connection',
        },
      ]

      // Count input tokens
      const inputTokens = countChatTokens(messages)

      // Test with a simple completion request
      const response = await openai.chat.completions.create({
        model: ANALYSIS_MODEL,
        messages,
        max_tokens: 10,
        temperature: 0,
      })

      const content = response.choices[0]?.message?.content

      // Extract token usage
      const apiTokenUsage = extractTokenUsageFromResponse(response)
      const tokenUsage = createTokenUsage(
        apiTokenUsage.inputTokens || inputTokens,
        apiTokenUsage.outputTokens || (content ? countTokens(content) : 0),
        ANALYSIS_MODEL
      )

      // Record token usage if userId provided
      if (args.userId) {
        try {
          await ctx.runMutation(api.usage_tracking.recordUsage, {
            userId: args.userId,
            model: ANALYSIS_MODEL,
            inputTokens: tokenUsage.inputTokens,
            outputTokens: tokenUsage.outputTokens,
            totalTokens: tokenUsage.totalTokens,
            cost: tokenUsage.cost,
            operationType: 'test',
          })
        } catch (usageError) {
          console.error('Failed to record test token usage:', usageError)
        }
      }

      if (content && content.toLowerCase().includes('ok')) {
        return { success: true, tokenUsage }
      } else {
        return {
          success: false,
          error: 'Unexpected response from OpenAI',
          tokenUsage,
        }
      }
    } catch (error) {
      console.error('OpenAI connection test failed:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Connection test failed',
      }
    }
  },
})

// Performance monitoring action
export const getAnalysisPerformanceMetrics = action({
  args: {},
  handler: async (): Promise<any> => {
    return getPerformanceMetrics()
  },
})

// Integrated action that analyzes a message and stores results in database
export const analyzeAndStoreMessage = action({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<AnalysisResponse & { analysisId?: string }> => {
    const tracker = createPerformanceTracker()

    try {
      // Step 1: Check if analysis already exists in database
      const existingAnalysis = await ctx.runQuery(
        api.analyses.getAnalysisByMessage,
        {
          messageId: args.messageId,
        }
      )

      if (existingAnalysis) {
        console.log(`Analysis already exists for message ${args.messageId}`)
        return {
          messageId: args.messageId,
          success: true,
          statementType: existingAnalysis.statementType,
          beliefs: existingAnalysis.beliefs,
          tradeOffs: existingAnalysis.tradeOffs,
          confidenceLevel: existingAnalysis.confidenceLevel,
          rawData: {
            originalMessage: args.content,
            analysisTimestamp: existingAnalysis.createdAt,
            modelUsed: ANALYSIS_MODEL,
            processingTimeMs: tracker.getElapsedMs(),
            cached: true,
          },
          analysisId: existingAnalysis._id,
        }
      }

      // Step 2: Perform OpenAI analysis
      const analysisResult = await ctx.runAction(
        api.actions.analyzeMessage,
        args
      )

      if (!analysisResult.success) {
        console.error(
          `Analysis failed for message ${args.messageId}:`,
          analysisResult.error
        )
        return analysisResult
      }

      // Step 3: Store analysis results in database
      try {
        const analysisId = await ctx.runMutation(api.analyses.createAnalysis, {
          messageId: args.messageId,
          statementType: analysisResult.statementType,
          beliefs: analysisResult.beliefs,
          tradeOffs: analysisResult.tradeOffs,
          confidenceLevel: analysisResult.confidenceLevel,
          rawData: analysisResult.rawData,
        })

        console.log(
          `Analysis stored successfully for message ${args.messageId}, analysisId: ${analysisId}`
        )

        return {
          ...analysisResult,
          analysisId,
        }
      } catch (storageError) {
        console.error(
          `Failed to store analysis for message ${args.messageId}:`,
          storageError
        )

        // Return the analysis result even if storage fails
        return {
          ...analysisResult,
          error: `Analysis completed but storage failed: ${storageError instanceof Error ? storageError.message : 'Unknown storage error'}`,
        }
      }
    } catch (error) {
      console.error(
        `Analyze and store failed for message ${args.messageId}:`,
        error
      )

      return {
        messageId: args.messageId,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Analysis and storage pipeline failed',
        statementType: 'other',
        beliefs: [],
        tradeOffs: [],
        confidenceLevel: 0,
        rawData: {
          originalMessage: args.content,
          analysisTimestamp: Date.now(),
          modelUsed: ANALYSIS_MODEL,
          processingTimeMs: tracker.getElapsedMs(),
          cached: false,
        },
      }
    }
  },
})

// Bulk analysis action for processing multiple messages
export const analyzeBulkMessages = action({
  args: {
    messages: v.array(
      v.object({
        messageId: v.id('messages'),
        content: v.string(),
        userId: v.string(),
        conversationId: v.string(),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<Array<AnalysisResponse & { analysisId?: string }>> => {
    console.log(`Starting bulk analysis for ${args.messages.length} messages`)

    // Process messages in parallel with concurrency limit
    const BATCH_SIZE = 3 // Limit concurrent OpenAI requests
    const results: Array<AnalysisResponse & { analysisId?: string }> = []

    for (let i = 0; i < args.messages.length; i += BATCH_SIZE) {
      const batch = args.messages.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(message =>
        ctx.runAction(api.actions.analyzeAndStoreMessage, message)
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < args.messages.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`Bulk analysis completed: ${results.length} messages processed`)
    return results
  },
})
