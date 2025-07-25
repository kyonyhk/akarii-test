import { OpenAIAnalysisResponse, StatementType } from '../types/analysis'

// Simple in-memory cache for analysis results
interface CacheEntry {
  result: OpenAIAnalysisResponse
  timestamp: number
}

const analysisCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 100 // Limit cache size to prevent memory issues

// Utility functions for message analysis

// Cache management functions
export function getCachedAnalysis(
  messageContent: string
): OpenAIAnalysisResponse | null {
  const cacheKey = createCacheKey(messageContent)
  const entry = analysisCache.get(cacheKey)

  if (!entry) {
    return null
  }

  // Check if cache entry is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    analysisCache.delete(cacheKey)
    return null
  }

  return entry.result
}

export function setCachedAnalysis(
  messageContent: string,
  result: OpenAIAnalysisResponse
): void {
  const cacheKey = createCacheKey(messageContent)

  // Clean old entries if cache is full
  if (analysisCache.size >= MAX_CACHE_SIZE) {
    cleanExpiredCacheEntries()

    // If still full after cleanup, remove oldest entries
    if (analysisCache.size >= MAX_CACHE_SIZE) {
      const oldestKeys = Array.from(analysisCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, Math.floor(MAX_CACHE_SIZE / 4))
        .map(([key]) => key)

      oldestKeys.forEach(key => analysisCache.delete(key))
    }
  }

  analysisCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  })
}

function createCacheKey(messageContent: string): string {
  // Create a simple hash for the message content
  // For production, consider using a proper hashing function
  return messageContent.toLowerCase().trim().slice(0, 200)
}

function cleanExpiredCacheEntries(): void {
  const now = Date.now()
  for (const [key, entry] of analysisCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      analysisCache.delete(key)
    }
  }
}

export function getCacheStats() {
  return {
    size: analysisCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  }
}

// Performance monitoring
interface PerformanceMetrics {
  totalRequests: number
  cacheHits: number
  averageResponseTime: number
  failureRate: number
  slowRequests: number // > 2 seconds
  recentTimes: number[] // Last 10 response times for trending
}

const performanceMetrics: PerformanceMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  averageResponseTime: 0,
  failureRate: 0,
  slowRequests: 0,
  recentTimes: [],
}

export function recordAnalysisMetrics(
  responseTimeMs: number,
  wasFromCache: boolean,
  wasSuccessful: boolean
) {
  performanceMetrics.totalRequests++

  if (wasFromCache) {
    performanceMetrics.cacheHits++
  }

  if (!wasSuccessful) {
    performanceMetrics.failureRate =
      ((performanceMetrics.totalRequests - performanceMetrics.cacheHits) *
        performanceMetrics.failureRate +
        1) /
      (performanceMetrics.totalRequests - performanceMetrics.cacheHits)
  }

  if (responseTimeMs > 2000) {
    performanceMetrics.slowRequests++
  }

  // Update recent times (keep last 10)
  performanceMetrics.recentTimes.push(responseTimeMs)
  if (performanceMetrics.recentTimes.length > 10) {
    performanceMetrics.recentTimes.shift()
  }

  // Update average response time
  const totalTime = performanceMetrics.recentTimes.reduce(
    (sum, time) => sum + time,
    0
  )
  performanceMetrics.averageResponseTime =
    totalTime / performanceMetrics.recentTimes.length
}

export function getPerformanceMetrics() {
  const cacheHitRate =
    performanceMetrics.totalRequests > 0
      ? (performanceMetrics.cacheHits / performanceMetrics.totalRequests) * 100
      : 0

  const slowRequestRate =
    performanceMetrics.totalRequests > 0
      ? (performanceMetrics.slowRequests / performanceMetrics.totalRequests) *
        100
      : 0

  return {
    ...performanceMetrics,
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    slowRequestRate: Math.round(slowRequestRate * 100) / 100,
    isPerformingWell:
      performanceMetrics.averageResponseTime < 2000 && slowRequestRate < 5,
  }
}

export function parseAnalysisResponse(
  response: string
): OpenAIAnalysisResponse {
  try {
    const parsed = JSON.parse(response)

    // Validate and normalize the response
    const analysis: OpenAIAnalysisResponse = {
      statement_type: validateStatementType(parsed.statement_type),
      beliefs: validateStringArray(parsed.beliefs, 'beliefs'),
      trade_offs: validateStringArray(parsed.trade_offs, 'trade_offs'),
      confidence_level: validateConfidenceLevel(parsed.confidence_level),
      reasoning:
        typeof parsed.reasoning === 'string'
          ? parsed.reasoning
          : 'No reasoning provided',
    }

    return analysis
  } catch (error) {
    throw new Error(
      `Failed to parse analysis response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

function validateStatementType(value: any): StatementType {
  const validTypes: StatementType[] = [
    'question',
    'opinion',
    'fact',
    'request',
    'other',
  ]

  if (
    typeof value === 'string' &&
    validTypes.includes(value as StatementType)
  ) {
    return value as StatementType
  }

  console.warn(`Invalid statement_type: ${value}, defaulting to 'other'`)
  return 'other'
}

function validateStringArray(value: any, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    console.warn(`${fieldName} is not an array, defaulting to empty array`)
    return []
  }

  return value
    .filter(item => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
    .slice(0, 5) // Limit to 5 items max
}

function validateConfidenceLevel(value: any): number {
  if (typeof value === 'number' && value >= 0 && value <= 100) {
    return Math.round(value)
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return Math.round(parsed)
    }
  }

  console.warn(`Invalid confidence_level: ${value}, defaulting to 50`)
  return 50
}

// Enhanced retry logic utilities with OpenAI-specific error handling
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      if (attempt === maxRetries) {
        break
      }

      // Calculate delay based on error type
      let delay = calculateRetryDelay(error, attempt, baseDelay)

      console.log(
        `Attempt ${attempt + 1} failed (${getErrorType(error)}), retrying in ${Math.round(delay)}ms...`
      )

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// OpenAI-specific error type detection and handling
function getErrorType(error: any): string {
  if (error?.error?.type) {
    return error.error.type
  }

  if (error?.status === 429 || error?.message?.includes('rate limit')) {
    return 'rate_limit_exceeded'
  }

  if (error?.status === 503 || error?.message?.includes('overloaded')) {
    return 'service_unavailable'
  }

  if (error?.status >= 500) {
    return 'server_error'
  }

  if (error?.status === 401) {
    return 'authentication_error'
  }

  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    return 'timeout_error'
  }

  return 'unknown_error'
}

// Smart retry delay calculation based on error type
function calculateRetryDelay(
  error: any,
  attempt: number,
  baseDelay: number
): number {
  const errorType = getErrorType(error)

  switch (errorType) {
    case 'rate_limit_exceeded':
      // Longer delays for rate limiting with exponential backoff
      return Math.min(
        baseDelay * Math.pow(3, attempt) + Math.random() * 2000,
        60000
      )

    case 'service_unavailable':
    case 'server_error':
      // Moderate delays for server issues
      return baseDelay * Math.pow(2, attempt) + Math.random() * 1500

    case 'timeout_error':
      // Shorter delays for timeout errors
      return Math.min(
        baseDelay * Math.pow(1.5, attempt) + Math.random() * 500,
        10000
      )

    case 'authentication_error':
      // No retry for auth errors - they won't resolve
      return 0

    default:
      // Standard exponential backoff with jitter
      return baseDelay * Math.pow(2, attempt) + Math.random() * 1000
  }
}

// Check if error is retryable
export function isRetryableError(error: any): boolean {
  const errorType = getErrorType(error)

  // Don't retry authentication errors or client errors
  if (
    errorType === 'authentication_error' ||
    (error?.status >= 400 && error?.status < 500 && error?.status !== 429)
  ) {
    return false
  }

  return true
}

// Performance monitoring
export function createPerformanceTracker() {
  const startTime = Date.now()

  return {
    getElapsedMs: () => Date.now() - startTime,
    checkTimeout: (maxMs: number) => {
      const elapsed = Date.now() - startTime
      if (elapsed > maxMs) {
        throw new Error(
          `Operation timed out after ${elapsed}ms (max: ${maxMs}ms)`
        )
      }
      return elapsed
    },
  }
}

// Fallback response generation for edge cases
export interface FallbackScenario {
  type:
    | 'timeout'
    | 'rate_limit'
    | 'service_error'
    | 'validation_failure'
    | 'content_filter'
    | 'unknown_error'
  severity: 'low' | 'medium' | 'high'
  userMessage?: string
  technicalDetails?: string
}

/**
 * Creates appropriate fallback responses for different error scenarios
 */
export function createFallbackAnalysis(
  messageId: string,
  originalContent: string,
  scenario: FallbackScenario,
  processingTimeMs?: number
): OpenAIAnalysisResponse {
  const timestamp = Date.now()

  // Determine statement type based on simple heuristics
  let statementType: StatementType = 'other'
  if (
    originalContent.includes('?') ||
    originalContent.toLowerCase().includes('how') ||
    originalContent.toLowerCase().includes('what') ||
    originalContent.toLowerCase().includes('why')
  ) {
    statementType = 'question'
  } else if (
    originalContent.toLowerCase().includes('please') ||
    originalContent.toLowerCase().includes('can you') ||
    originalContent.toLowerCase().includes('could you')
  ) {
    statementType = 'request'
  } else if (
    originalContent.toLowerCase().includes('think') ||
    originalContent.toLowerCase().includes('believe') ||
    originalContent.toLowerCase().includes('feel')
  ) {
    statementType = 'opinion'
  }

  const fallbackResponse: OpenAIAnalysisResponse = {
    statement_type: statementType,
    beliefs: [],
    trade_offs: [],
    confidence_level: 0,
    reasoning: generateFallbackReasoning(scenario, originalContent),
  }

  return fallbackResponse
}

/**
 * Generates appropriate reasoning text for fallback scenarios
 */
function generateFallbackReasoning(
  scenario: FallbackScenario,
  originalContent: string
): string {
  const baseMessage = `Analysis could not be completed due to ${scenario.type}.`

  switch (scenario.type) {
    case 'timeout':
      return `${baseMessage} The message analysis request exceeded the allowed processing time. This may be due to complex content or temporary service delays. The message appears to be ${originalContent.length > 100 ? 'lengthy' : 'standard length'} and may require manual review.`

    case 'rate_limit':
      return `${baseMessage} The service is currently experiencing high demand. Please try again in a few moments. No analysis could be performed on this message.`

    case 'service_error':
      return `${baseMessage} The analysis service encountered a technical issue. This is likely temporary and the message should be reanalyzed when service is restored.`

    case 'validation_failure':
      return `${baseMessage} The message content or analysis output failed quality validation checks. This may indicate complex or ambiguous content that requires human review.`

    case 'content_filter':
      return `${baseMessage} The message content was flagged by safety filters and cannot be processed through automated analysis. Manual review may be required.`

    case 'unknown_error':
    default:
      return `${baseMessage} An unexpected error occurred during analysis. The message content appears to be ${originalContent.length} characters long. Manual analysis may be required.`
  }
}

/**
 * Determines the appropriate fallback scenario based on error details
 */
export function classifyErrorForFallback(error: any): FallbackScenario {
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorStatus = error?.status || 0

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      type: 'timeout',
      severity: 'medium',
      userMessage: 'Analysis took too long and was cancelled',
      technicalDetails: errorMessage,
    }
  }

  if (errorStatus === 429 || errorMessage.includes('rate limit')) {
    return {
      type: 'rate_limit',
      severity: 'low',
      userMessage: 'Service is busy, please try again shortly',
      technicalDetails: `Rate limit: ${errorMessage}`,
    }
  }

  if (
    errorStatus >= 500 ||
    errorMessage.includes('service') ||
    errorMessage.includes('server')
  ) {
    return {
      type: 'service_error',
      severity: 'high',
      userMessage: 'Analysis service temporarily unavailable',
      technicalDetails: `Server error: ${errorMessage}`,
    }
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      type: 'validation_failure',
      severity: 'medium',
      userMessage: 'Message could not be analyzed due to content complexity',
      technicalDetails: `Validation error: ${errorMessage}`,
    }
  }

  if (
    errorMessage.includes('content') ||
    errorMessage.includes('filter') ||
    errorMessage.includes('inappropriate')
  ) {
    return {
      type: 'content_filter',
      severity: 'high',
      userMessage: 'Message content requires manual review',
      technicalDetails: `Content filter: ${errorMessage}`,
    }
  }

  return {
    type: 'unknown_error',
    severity: 'high',
    userMessage: 'Analysis failed due to unexpected error',
    technicalDetails: errorMessage,
  }
}

/**
 * Enhanced retry logic with fallback handling
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  messageId: string,
  originalContent: string,
  maxRetries: number = 3,
  baseDelay: number = 750
): Promise<T | OpenAIAnalysisResponse> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.log(
          `Non-retryable error on attempt ${attempt + 1}, falling back:`,
          error
        )
        break
      }

      // If this is the last attempt, fall back
      if (attempt === maxRetries - 1) {
        console.log(`All retry attempts exhausted, falling back:`, error)
        break
      }

      // Calculate delay for next attempt
      const delay = calculateRetryDelay(error, attempt, baseDelay)
      if (delay > 0) {
        console.log(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          error.message
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Create fallback response
  const scenario = classifyErrorForFallback(lastError)
  console.log(`Creating fallback response for scenario: ${scenario.type}`)

  return createFallbackAnalysis(messageId, originalContent, scenario)
}
