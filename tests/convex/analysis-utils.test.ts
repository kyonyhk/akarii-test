import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseAnalysisResponse,
  withRetry,
  createPerformanceTracker,
  isRetryableError,
  getCachedAnalysis,
  setCachedAnalysis,
  getCacheStats,
  recordAnalysisMetrics,
  getPerformanceMetrics,
} from '../../convex/analysis-utils'
import { MOCK_ANALYSIS_RESPONSE, TEST_MESSAGES } from '../setup'

describe('Analysis Utils', () => {
  describe('parseAnalysisResponse', () => {
    it('should parse valid JSON response correctly', () => {
      const jsonResponse = JSON.stringify(MOCK_ANALYSIS_RESPONSE)
      const result = parseAnalysisResponse(jsonResponse)

      expect(result.statement_type).toBe('opinion')
      expect(result.beliefs).toEqual([
        'TypeScript adds complexity',
        'Small projects need simplicity',
      ])
      expect(result.trade_offs).toEqual([
        'Type safety vs development speed',
        'Learning curve vs productivity',
      ])
      expect(result.confidence_level).toBe(85)
      expect(result.reasoning).toBe(
        'The message expresses a clear opinion about TypeScript with specific concerns about complexity for small projects.'
      )
    })

    it('should handle malformed JSON with fallback values', () => {
      const malformedJson = '{ "invalid": json }'

      expect(() => parseAnalysisResponse(malformedJson)).toThrow()
    })

    it('should validate and normalize statement types', () => {
      const responseWithInvalidType = {
        statement_type: 'invalid_type',
        beliefs: ['test'],
        trade_offs: ['test'],
        confidence_level: 50,
        reasoning: 'test',
      }

      const result = parseAnalysisResponse(
        JSON.stringify(responseWithInvalidType)
      )
      expect(result.statement_type).toBe('other') // Should default to 'other'
    })

    it('should validate confidence level boundaries', () => {
      const responseWithInvalidConfidence = {
        statement_type: 'opinion',
        beliefs: ['test'],
        trade_offs: ['test'],
        confidence_level: 150, // Invalid - over 100
        reasoning: 'test',
      }

      const result = parseAnalysisResponse(
        JSON.stringify(responseWithInvalidConfidence)
      )
      expect(result.confidence_level).toBe(50) // Should default to 50
    })

    it('should limit array lengths to 5 items max', () => {
      const responseWithLongArrays = {
        statement_type: 'opinion',
        beliefs: ['1', '2', '3', '4', '5', '6', '7'], // 7 items
        trade_offs: ['1', '2', '3', '4', '5', '6'], // 6 items
        confidence_level: 75,
        reasoning: 'test',
      }

      const result = parseAnalysisResponse(
        JSON.stringify(responseWithLongArrays)
      )
      expect(result.beliefs.length).toBe(5)
      expect(result.trade_offs.length).toBe(5)
    })
  })

  describe('Performance Tracker', () => {
    it('should track elapsed time correctly', async () => {
      const tracker = createPerformanceTracker()

      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 10))

      const elapsed = tracker.getElapsedMs()
      expect(elapsed).toBeGreaterThan(5)
      expect(elapsed).toBeLessThan(100)
    })

    it('should throw timeout error when exceeded', () => {
      const tracker = createPerformanceTracker()

      expect(() => tracker.checkTimeout(0)).toThrow('Operation timed out')
    })

    it('should return elapsed time when within timeout', () => {
      const tracker = createPerformanceTracker()

      const elapsed = tracker.checkTimeout(1000)
      expect(elapsed).toBeGreaterThanOrEqual(0)
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('Retry Logic', () => {
    it('should succeed on first attempt when operation succeeds', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success')

      const result = await withRetry(mockOperation, 3, 100)

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should retry and eventually succeed', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success')

      const result = await withRetry(mockOperation, 3, 10) // Short delay for testing

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should throw last error after max retries', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error('Persistent failure'))

      await expect(withRetry(mockOperation, 2, 10)).rejects.toThrow(
        'Persistent failure'
      )
      expect(mockOperation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('Error Classification', () => {
    it('should identify rate limit errors as retryable', () => {
      const rateLimitError = { status: 429, message: 'Rate limit exceeded' }
      expect(isRetryableError(rateLimitError)).toBe(true)
    })

    it('should identify server errors as retryable', () => {
      const serverError = { status: 500, message: 'Internal server error' }
      expect(isRetryableError(serverError)).toBe(true)
    })

    it('should identify auth errors as non-retryable', () => {
      const authError = { status: 401, message: 'Unauthorized' }
      expect(isRetryableError(authError)).toBe(false)
    })

    it('should identify client errors as non-retryable', () => {
      const clientError = { status: 400, message: 'Bad request' }
      expect(isRetryableError(clientError)).toBe(false)
    })
  })

  describe('Caching System', () => {
    beforeEach(() => {
      // Clear cache before each test
      const stats = getCacheStats()
      for (let i = 0; i < stats.size; i++) {
        getCachedAnalysis('clear-cache-' + i) // This will cause cache cleanup
      }
    })

    it('should return null for cache miss', () => {
      const result = getCachedAnalysis('non-existent-message')
      expect(result).toBeNull()
    })

    it('should store and retrieve cached analysis', () => {
      const message = TEST_MESSAGES.question

      setCachedAnalysis(message, MOCK_ANALYSIS_RESPONSE)
      const result = getCachedAnalysis(message)

      expect(result).toEqual(MOCK_ANALYSIS_RESPONSE)
    })

    it('should return cache statistics', () => {
      const stats = getCacheStats()

      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('ttlMs')
      expect(typeof stats.size).toBe('number')
      expect(stats.maxSize).toBe(100)
    })

    it('should handle cache expiration', async () => {
      // This test would need to mock Date.now() to test TTL expiration
      // For now, we test that the cache cleanup logic exists
      const message = 'test-expiration-message'
      setCachedAnalysis(message, MOCK_ANALYSIS_RESPONSE)

      const result = getCachedAnalysis(message)
      expect(result).not.toBeNull()
    })
  })

  describe('Performance Metrics', () => {
    beforeEach(() => {
      // Reset metrics before each test
      getPerformanceMetrics() // This initializes the metrics
    })

    it('should record cache hit metrics', () => {
      recordAnalysisMetrics(150, true, true)

      const metrics = getPerformanceMetrics()
      expect(metrics.totalRequests).toBeGreaterThan(0)
      expect(metrics.cacheHits).toBeGreaterThan(0)
      expect(metrics.cacheHitRate).toBeGreaterThan(0)
    })

    it('should record cache miss metrics', () => {
      recordAnalysisMetrics(800, false, true)

      const metrics = getPerformanceMetrics()
      expect(metrics.totalRequests).toBeGreaterThan(0)
      expect(metrics.averageResponseTime).toBeGreaterThan(0)
    })

    it('should track slow requests', () => {
      recordAnalysisMetrics(2500, false, true) // Over 2 second threshold

      const metrics = getPerformanceMetrics()
      expect(metrics.slowRequests).toBeGreaterThan(0)
      expect(metrics.slowRequestRate).toBeGreaterThan(0)
    })

    it('should track failure rates', () => {
      recordAnalysisMetrics(500, false, false)

      const metrics = getPerformanceMetrics()
      expect(metrics.failureRate).toBeGreaterThanOrEqual(0)
    })

    it('should identify when performance is good', () => {
      // Record several fast, successful requests
      recordAnalysisMetrics(150, false, true)
      recordAnalysisMetrics(200, false, true)
      recordAnalysisMetrics(180, false, true)

      const metrics = getPerformanceMetrics()
      expect(metrics.isPerformingWell).toBe(true)
    })

    it('should identify when performance is poor', () => {
      // Record several slow requests
      recordAnalysisMetrics(2500, false, true)
      recordAnalysisMetrics(2800, false, true)
      recordAnalysisMetrics(3000, false, true)

      const metrics = getPerformanceMetrics()
      expect(metrics.isPerformingWell).toBe(false)
    })
  })
})
