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
  getSystemPrompt,
  getUserPrompt,
  formatAnalysisOutput,
  PromptConfiguration,
  DEFAULT_PRODUCTION_CONFIG,
  QUESTION_FOCUSED_TEST_CONFIG,
} from './promptConfig'
import {
  extractConversationContext,
  assessContextQuality,
  adjustConfidenceForContext,
} from './contextAnalysis'
import {
  parseAnalysisResponse,
  withRetry,
  createPerformanceTracker,
  isRetryableError,
  getCachedAnalysis,
  setCachedAnalysis,
  recordAnalysisMetrics,
  getPerformanceMetrics,
  withFallback,
  createFallbackAnalysis,
  classifyErrorForFallback,
} from './analysis_utils'
import {
  validateAnalysisInput,
  ContentValidationResult,
} from './inputValidation'
import {
  validateAnalysisOutput,
  createFallbackResponse,
  EnhancedValidationResult,
} from './outputValidation'
import {
  countChatTokens,
  countTokens,
  createTokenUsage,
  extractTokenUsageFromResponse,
} from './token_utils'
import { api } from './_generated/api'

// Enhanced action to analyze a message using OpenAI with improved prompts
export const analyzeMessage = action({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
    teamId: v.optional(v.id('teams')),
    promptConfig: v.optional(
      v.object({
        variant: v.union(
          v.literal('standard'),
          v.literal('question_focused'),
          v.literal('confidence_calibrated'),
          v.literal('context_aware')
        ),
        mode: v.union(
          v.literal('production'),
          v.literal('testing'),
          v.literal('a_b_test')
        ),
        experimentId: v.optional(v.string()),
      })
    ),
    useContext: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<AnalysisResponse> => {
    const tracker = createPerformanceTracker()

    try {
      // Input validation and sanitization
      const inputValidation = validateAnalysisInput(args)

      if (!inputValidation.isValid) {
        console.error('Input validation failed:', inputValidation.errors)
        return {
          messageId: args.messageId,
          success: false,
          error: `Input validation failed: ${inputValidation.errors.join(', ')}`,
          rawData: {
            originalMessage: args.content,
            analysisTimestamp: Date.now(),
            modelUsed: ANALYSIS_MODEL,
            processingTimeMs: tracker.getElapsedMs(),
            cached: false,
            validationErrors: inputValidation.errors,
            riskLevel: inputValidation.riskLevel,
          },
        }
      }

      // Log validation warnings if any
      if (inputValidation.warnings.length > 0) {
        console.warn('Input validation warnings:', inputValidation.warnings)
      }

      // Use sanitized arguments for processing
      const sanitizedArgs = inputValidation.sanitizedArgs || args

      // Validate OpenAI configuration
      if (!validateOpenAIConfig()) {
        throw new Error('OpenAI API is not properly configured')
      }

      // Set up prompt configuration
      const promptConfig: PromptConfiguration = {
        variant: sanitizedArgs.promptConfig?.variant || 'standard',
        mode: sanitizedArgs.promptConfig?.mode || 'production',
        experimentId: sanitizedArgs.promptConfig?.experimentId,
        contextOptions: {
          maxContextMessages: 5,
          includeParticipants: true,
          useContextAwarePrompt: sanitizedArgs.useContext || false,
        },
      }

      // Extract conversation context if needed
      let conversationContext
      let contextQuality: 'high' | 'medium' | 'low' = 'low'

      if (
        sanitizedArgs.useContext ||
        promptConfig.variant === 'context_aware'
      ) {
        try {
          // Get conversation messages for context
          const messages = await ctx.runQuery(
            api.messages.getMessagesInConversation,
            {
              conversationId: sanitizedArgs.conversationId,
              limit: 10,
            }
          )

          conversationContext = extractConversationContext(
            messages,
            sanitizedArgs.messageId
          )
          contextQuality = assessContextQuality(
            sanitizedArgs.content,
            conversationContext
          )
        } catch (contextError) {
          console.warn('Failed to extract conversation context:', contextError)
          // Continue without context
        }
      }

      // Check enhanced cache (includes prompt variant)
      const cacheKey = `${sanitizedArgs.content}_${promptConfig.variant}_${contextQuality}`
      const cachedResult = getCachedAnalysis(cacheKey)
      if (cachedResult) {
        console.log(
          `Enhanced cache hit for message ${sanitizedArgs.messageId} (${tracker.getElapsedMs()}ms)`
        )

        // Record cache hit metrics
        recordAnalysisMetrics(tracker.getElapsedMs(), true, true)

        const analysis: AnalysisResponse = {
          messageId: sanitizedArgs.messageId,
          success: true,
          statementType: cachedResult.statement_type,
          beliefs: cachedResult.beliefs,
          tradeOffs: cachedResult.trade_offs,
          confidenceLevel: cachedResult.confidence_level,
          rawData: {
            originalMessage: sanitizedArgs.content,
            analysisTimestamp: Date.now(),
            modelUsed: ANALYSIS_MODEL,
            processingTimeMs: tracker.getElapsedMs(),
            cached: true,
            promptVariant: promptConfig.variant,
            contextQuality,
          },
        }
        return analysis
      }

      // Generate enhanced prompts based on configuration
      const systemPrompt = getSystemPrompt(promptConfig)
      const userPrompt = getUserPrompt(
        sanitizedArgs.content,
        promptConfig,
        conversationContext
      )

      // Prepare messages for OpenAI API
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: userPrompt,
        },
      ]

      // Count input tokens
      const inputTokens = countChatTokens(messages)

      // Estimate token usage and cost for usage limit checking
      let estimatedTokens = inputTokens + 300 // Estimate output tokens
      let estimatedCost = calculateCost(inputTokens, 300, ANALYSIS_MODEL)

      // Check usage limits if teamId is provided
      if (sanitizedArgs.teamId) {
        const usageCheck = await ctx.runQuery(
          'usage_enforcement:checkUsageLimits',
          {
            teamId: sanitizedArgs.teamId,
            estimatedTokens,
            estimatedCost,
          }
        )

        if (!usageCheck.allowed) {
          // Record the blocked request
          if (usageCheck.reason === 'usage_limit_exceeded') {
            await ctx.runMutation('usage_enforcement:recordBlockedRequest', {
              teamId: sanitizedArgs.teamId,
              userId: sanitizedArgs.userId,
              limitType: 'token_limit',
              estimatedTokens,
              estimatedCost,
              reason: usageCheck.message,
            })
          }

          // Return error response for blocked request
          return {
            messageId: sanitizedArgs.messageId,
            success: false,
            error: usageCheck.message,
            errorCode: usageCheck.reason,
            requiresApproval: usageCheck.requiresAdmin,
            statementType: 'other',
            beliefs: [],
            tradeOffs: [],
            confidenceLevel: 0,
            rawData: {
              originalMessage: sanitizedArgs.content,
              analysisTimestamp: Date.now(),
              modelUsed: ANALYSIS_MODEL,
              processingTimeMs: tracker.getElapsedMs(),
              cached: false,
              blocked: true,
              blockReason: usageCheck.reason,
            },
          }
        }
      }

      // Make OpenAI API call with enhanced retry logic and fallback handling
      const analysisAttempt = await withFallback(
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

            // Parse the raw JSON response
            let rawAnalysisResult
            try {
              rawAnalysisResult = JSON.parse(openaiResponse)
            } catch (parseError) {
              throw new Error(
                `Invalid JSON response from OpenAI: ${parseError}`
              )
            }

            // Format and validate using enhanced output formatting
            const formattedResult = formatAnalysisOutput(
              rawAnalysisResult,
              promptConfig,
              tracker.getElapsedMs(),
              contextQuality,
              sanitizedArgs.content
            )

            if (!formattedResult.validation.isValid) {
              throw new Error(
                `Invalid analysis output: ${formattedResult.validation.errors.join(', ')}`
              )
            }

            return {
              analysisResult: formattedResult.output,
              tokenUsage,
              qualityScore: formattedResult.quality.score,
              qualityFactors: formattedResult.quality.factors,
            }
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
        sanitizedArgs.messageId,
        sanitizedArgs.content,
        3,
        750
      ) // Max 3 retries, 750ms base delay for better rate limit handling

      // Handle fallback response if analysis failed
      if ('statement_type' in analysisAttempt) {
        // This is a fallback OpenAIAnalysisResponse
        const fallbackResult = analysisAttempt
        console.log(
          `Using fallback analysis for message ${sanitizedArgs.messageId}`
        )

        return {
          messageId: sanitizedArgs.messageId,
          success: false,
          error: 'Analysis completed with fallback due to service issues',
          statementType: fallbackResult.statement_type,
          beliefs: fallbackResult.beliefs,
          tradeOffs: fallbackResult.trade_offs,
          confidenceLevel: fallbackResult.confidence_level,
          rawData: {
            originalMessage: sanitizedArgs.content,
            analysisTimestamp: Date.now(),
            modelUsed: ANALYSIS_MODEL,
            processingTimeMs: tracker.getElapsedMs(),
            cached: false,
            fallbackUsed: true,
            fallbackReason: fallbackResult.reasoning,
          },
        }
      }

      // Normal analysis succeeded
      const { analysisResult, tokenUsage, qualityScore, qualityFactors } =
        analysisAttempt

      // Record token usage in database
      try {
        await ctx.runMutation(api.usage_tracking.recordUsage, {
          messageId: sanitizedArgs.messageId,
          teamId: sanitizedArgs.teamId,
          userId: sanitizedArgs.userId,
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

      // Cache the successful result with enhanced key
      setCachedAnalysis(cacheKey, analysisResult)

      // Convert to our response format with enhanced metadata
      const analysis: AnalysisResponse = {
        messageId: sanitizedArgs.messageId,
        success: true,
        statementType: analysisResult.statement_type,
        beliefs: analysisResult.beliefs,
        tradeOffs: analysisResult.trade_offs,
        confidenceLevel: analysisResult.confidence_level,
        rawData: {
          originalMessage: sanitizedArgs.content,
          analysisTimestamp: Date.now(),
          modelUsed: ANALYSIS_MODEL,
          processingTimeMs: tracker.getElapsedMs(),
          cached: false,
          promptVariant: promptConfig.variant,
          contextQuality,
          qualityScore,
          qualityFactors,
          experimentId: promptConfig.experimentId,
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
        `Analysis completed for message ${sanitizedArgs.messageId} in ${tracker.getElapsedMs()}ms`
      )
      return analysis
    } catch (error) {
      console.error('Error analyzing message:', error)

      // Record failure metrics
      recordAnalysisMetrics(tracker.getElapsedMs(), false, false)

      return {
        messageId: sanitizedArgs.messageId,
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        statementType: 'other',
        beliefs: [],
        tradeOffs: [],
        confidenceLevel: 0,
        rawData: {
          originalMessage: sanitizedArgs.content,
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

// A/B Testing action for question-focused prompt improvements
export const analyzeMessageWithQuestionFocus = action({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
    teamId: v.optional(v.id('teams')),
  },
  handler: async (ctx, args): Promise<AnalysisResponse> => {
    // Use question-focused configuration for A/B testing
    return ctx.runAction(api.actions.analyzeMessage, {
      ...args,
      promptConfig: {
        variant: 'question_focused',
        mode: 'a_b_test',
        experimentId: 'question_analysis_improvement_v1',
      },
    })
  },
})

// Confidence-calibrated analysis action for testing
export const analyzeMessageWithConfidenceCalibration = action({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
    teamId: v.optional(v.id('teams')),
  },
  handler: async (ctx, args): Promise<AnalysisResponse> => {
    // Use confidence-calibrated configuration
    return ctx.runAction(api.actions.analyzeMessage, {
      ...args,
      promptConfig: {
        variant: 'confidence_calibrated',
        mode: 'testing',
        experimentId: 'confidence_calibration_v1',
      },
    })
  },
})

// Context-aware analysis action for testing
export const analyzeMessageWithContext = action({
  args: {
    messageId: v.id('messages'),
    content: v.string(),
    userId: v.string(),
    conversationId: v.string(),
    teamId: v.optional(v.id('teams')),
  },
  handler: async (ctx, args): Promise<AnalysisResponse> => {
    // Use context-aware configuration
    return ctx.runAction(api.actions.analyzeMessage, {
      ...args,
      promptConfig: {
        variant: 'context_aware',
        mode: 'testing',
        experimentId: 'context_awareness_v1',
      },
      useContext: true,
    })
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
