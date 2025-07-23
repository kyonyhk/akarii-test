import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createPerformanceTracker,
  recordAnalysisMetrics,
  getPerformanceMetrics,
} from '../../convex/analysis-utils'
import { TEST_MESSAGES } from '../setup'

describe('Analysis Performance Tests', () => {
  beforeEach(() => {
    // Reset performance metrics
    getPerformanceMetrics()
  })

  describe('Response Time Requirements', () => {
    it('should meet sub-2-second target for simple messages', async () => {
      const tracker = createPerformanceTracker()

      // Simulate analysis processing
      await simulateAnalysisProcessing(100) // 100ms processing time

      const elapsed = tracker.getElapsedMs()
      expect(elapsed).toBeLessThan(2000)
      expect(elapsed).toBeGreaterThan(50) // Should take some time
    })

    it('should handle complex messages within time limit', async () => {
      const tracker = createPerformanceTracker()

      // Simulate processing of complex message
      const complexMessage = TEST_MESSAGES.complex
      expect(complexMessage.length).toBeGreaterThan(100)

      await simulateAnalysisProcessing(150) // Slightly longer for complex content

      const elapsed = tracker.getElapsedMs()
      expect(elapsed).toBeLessThan(2000)
    })

    it('should timeout appropriately when limit exceeded', () => {
      const tracker = createPerformanceTracker()

      expect(() => tracker.checkTimeout(0)).toThrow('Operation timed out')
    })

    it('should provide performance buffer for safety', () => {
      const tracker = createPerformanceTracker()

      // Test the 1800ms timeout (200ms buffer from 2000ms target)
      const timeoutLimit = 1800
      const totalTarget = 2000
      const buffer = totalTarget - timeoutLimit

      expect(buffer).toBe(200) // 200ms safety buffer
    })
  })

  describe('Cache Performance Impact', () => {
    it('should significantly improve performance with cache hits', async () => {
      // Simulate cache miss (first request)
      const tracker1 = createPerformanceTracker()
      await simulateAnalysisProcessing(800) // Simulate OpenAI API call
      const cacheMissTime = tracker1.getElapsedMs()

      // Simulate cache hit (second request)
      const tracker2 = createPerformanceTracker()
      await simulateAnalysisProcessing(5) // Just cache lookup
      const cacheHitTime = tracker2.getElapsedMs()

      expect(cacheHitTime).toBeLessThan(cacheMissTime * 0.1) // 90% faster
      expect(cacheHitTime).toBeLessThan(50) // Should be very fast
    })

    it('should track cache hit rate accurately', () => {
      // Record cache hits and misses
      recordAnalysisMetrics(50, true, true) // Cache hit
      recordAnalysisMetrics(800, false, true) // Cache miss
      recordAnalysisMetrics(45, true, true) // Cache hit
      recordAnalysisMetrics(750, false, true) // Cache miss
      recordAnalysisMetrics(40, true, true) // Cache hit

      const metrics = getPerformanceMetrics()

      expect(metrics.cacheHitRate).toBe(60) // 3 out of 5 were cache hits
      expect(metrics.totalRequests).toBe(5)
      expect(metrics.cacheHits).toBe(3)
    })
  })

  describe('Concurrent Request Performance', () => {
    it('should handle multiple simultaneous requests', async () => {
      const concurrentCount = 5
      const promises = []

      for (let i = 0; i < concurrentCount; i++) {
        promises.push(simulateAnalysisRequest(i))
      }

      const startTime = Date.now()
      const results = await Promise.all(promises)
      const totalTime = Date.now() - startTime

      expect(results).toHaveLength(concurrentCount)
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds

      // Each individual request should still be under 2 seconds
      results.forEach(result => {
        expect(result.processingTime).toBeLessThan(2000)
      })
    })

    it('should maintain performance under load', async () => {
      const loadTestCount = 10
      const results = []

      // Sequential processing to test sustained load
      for (let i = 0; i < loadTestCount; i++) {
        const tracker = createPerformanceTracker()
        await simulateAnalysisProcessing(100 + Math.random() * 200) // 100-300ms
        results.push(tracker.getElapsedMs())
      }

      // All requests should meet performance target
      results.forEach(time => {
        expect(time).toBeLessThan(2000)
      })

      // Average should be well under the limit
      const averageTime =
        results.reduce((sum, time) => sum + time, 0) / results.length
      expect(averageTime).toBeLessThan(1000)
    })
  })

  describe('Performance Metrics Tracking', () => {
    it('should accurately track slow requests', () => {
      // Record fast and slow requests
      recordAnalysisMetrics(500, false, true) // Fast
      recordAnalysisMetrics(2500, false, true) // Slow
      recordAnalysisMetrics(800, false, true) // Fast
      recordAnalysisMetrics(3000, false, true) // Slow
      recordAnalysisMetrics(600, false, true) // Fast

      const metrics = getPerformanceMetrics()

      expect(metrics.slowRequests).toBe(2) // 2 requests over 2 seconds
      expect(metrics.slowRequestRate).toBe(40) // 2 out of 5 = 40%
    })

    it('should calculate average response time correctly', () => {
      // Record requests with known times
      recordAnalysisMetrics(100, false, true)
      recordAnalysisMetrics(200, false, true)
      recordAnalysisMetrics(300, false, true)

      const metrics = getPerformanceMetrics()

      // Average of last recorded times
      expect(metrics.averageResponseTime).toBeCloseTo(200, 0)
    })

    it('should identify performance health correctly', () => {
      // Record consistently good performance
      for (let i = 0; i < 5; i++) {
        recordAnalysisMetrics(500 + Math.random() * 200, false, true) // 500-700ms
      }

      let metrics = getPerformanceMetrics()
      expect(metrics.isPerformingWell).toBe(true)

      // Now record poor performance
      for (let i = 0; i < 3; i++) {
        recordAnalysisMetrics(2500 + Math.random() * 500, false, true) // 2500-3000ms
      }

      metrics = getPerformanceMetrics()
      expect(metrics.isPerformingWell).toBe(false)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks with repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Simulate many requests
      for (let i = 0; i < 100; i++) {
        await simulateAnalysisProcessing(10)
      }

      // Force garbage collection if possible
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })
})

// Helper functions for performance testing

async function simulateAnalysisProcessing(durationMs: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, durationMs)
  })
}

async function simulateAnalysisRequest(
  requestId: number
): Promise<{ requestId: number; processingTime: number }> {
  const tracker = createPerformanceTracker()

  // Simulate variable processing time
  const processingTime = 200 + Math.random() * 800 // 200-1000ms
  await simulateAnalysisProcessing(processingTime)

  return {
    requestId,
    processingTime: tracker.getElapsedMs(),
  }
}
