import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateCost,
  calculateCostBreakdown,
  countTokens,
  countChatTokens,
  getSupportedModels,
  isModelSupported,
  getModelPricing,
  createTokenUsage,
  extractTokenUsageFromResponse,
  estimateChatCost,
  compareModelCosts,
  type SupportedModel,
} from '../../convex/token_utils'

describe('Token Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSupportedModels', () => {
    it('should return all supported model names', () => {
      const models = getSupportedModels()
      expect(models).toContain('gpt-4o')
      expect(models).toContain('gpt-4o-mini')
      expect(models).toContain('gpt-4')
      expect(models).toContain('gpt-4-32k')
      expect(models).toContain('gpt-4-turbo')
      expect(models).toContain('gpt-3.5-turbo')
      expect(models).toContain('gpt-3.5-turbo-0125')
      expect(models.length).toBe(7)
    })
  })

  describe('isModelSupported', () => {
    it('should return true for supported models', () => {
      expect(isModelSupported('gpt-4o')).toBe(true)
      expect(isModelSupported('gpt-4o-mini')).toBe(true)
      expect(isModelSupported('gpt-4')).toBe(true)
    })

    it('should return false for unsupported models', () => {
      expect(isModelSupported('gpt-5')).toBe(false)
      expect(isModelSupported('claude-3')).toBe(false)
      expect(isModelSupported('')).toBe(false)
    })
  })

  describe('getModelPricing', () => {
    it('should return correct pricing for supported models', () => {
      expect(getModelPricing('gpt-4o')).toEqual({
        input: 5.0,
        output: 20.0,
      })
      expect(getModelPricing('gpt-4o-mini')).toEqual({
        input: 0.15,
        output: 0.6,
      })
      expect(getModelPricing('gpt-4')).toEqual({
        input: 30.0,
        output: 60.0,
      })
    })

    it('should return null for unsupported models', () => {
      expect(getModelPricing('gpt-5')).toBeNull()
      expect(getModelPricing('unknown-model')).toBeNull()
    })
  })

  describe('countTokens', () => {
    it('should estimate tokens correctly using character-based approach', () => {
      expect(countTokens('Hello')).toBe(2) // 5 chars / 4 = 1.25 -> 2
      expect(countTokens('')).toBe(0)
      expect(countTokens('This is a test message')).toBe(6) // 22 chars / 4 = 5.5 -> 6
    })

    it('should handle very long strings', () => {
      const longText = 'A'.repeat(4000)
      expect(countTokens(longText)).toBe(1000) // 4000 chars / 4 = 1000
    })
  })

  describe('countChatTokens', () => {
    it('should count tokens in chat messages with overhead', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]
      // 'Hello' = 2 tokens + 4 overhead = 6
      // 'Hi there!' = 3 tokens + 4 overhead = 7
      // Total = 13
      expect(countChatTokens(messages)).toBe(13)
    })

    it('should handle empty messages', () => {
      const messages = [{ role: 'user', content: '' }]
      expect(countChatTokens(messages)).toBe(4) // Just overhead
    })

    it('should handle multiple messages', () => {
      const messages = [
        { role: 'user', content: 'Test' }, // 1 + 4 = 5
        { role: 'assistant', content: 'Response' }, // 2 + 4 = 6
        { role: 'user', content: 'Follow up' }, // 3 + 4 = 7
      ]
      expect(countChatTokens(messages)).toBe(18)
    })
  })

  describe('calculateCost', () => {
    it('should calculate cost correctly for gpt-4o', () => {
      const cost = calculateCost(1000, 500, 'gpt-4o')
      // (1000 * 5.0 / 1,000,000) + (500 * 20.0 / 1,000,000)
      // = 0.005 + 0.01 = 0.015
      expect(cost).toBe(0.015)
    })

    it('should calculate cost correctly for gpt-4o-mini', () => {
      const cost = calculateCost(1000, 500, 'gpt-4o-mini')
      // (1000 * 0.15 / 1,000,000) + (500 * 0.6 / 1,000,000)
      // = 0.00015 + 0.0003 = 0.00045
      expect(cost).toBe(0.00045)
    })

    it('should handle zero tokens', () => {
      expect(calculateCost(0, 0, 'gpt-4o')).toBe(0)
      expect(calculateCost(1000, 0, 'gpt-4o')).toBe(0.005)
      expect(calculateCost(0, 500, 'gpt-4o')).toBe(0.01)
    })

    it('should use fallback pricing for unknown models', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      const cost = calculateCost(1000, 500, 'unknown-model')

      // Should use gpt-4o-mini fallback pricing
      expect(cost).toBe(0.00045)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown model: unknown-model, using gpt-4o-mini pricing as fallback'
      )
    })

    it('should throw error for negative token counts', () => {
      expect(() => calculateCost(-1, 500, 'gpt-4o')).toThrow(
        'Token counts cannot be negative'
      )
      expect(() => calculateCost(1000, -1, 'gpt-4o')).toThrow(
        'Token counts cannot be negative'
      )
    })
  })

  describe('calculateCostBreakdown', () => {
    it('should provide detailed cost breakdown', () => {
      const breakdown = calculateCostBreakdown(1000, 500, 'gpt-4o')

      expect(breakdown.inputCost).toBe(0.005)
      expect(breakdown.outputCost).toBe(0.01)
      expect(breakdown.totalCost).toBe(0.015)
      expect(breakdown.pricing).toEqual({ input: 5.0, output: 20.0 })
      expect(breakdown.model).toBe('gpt-4o')
      expect(breakdown.usedFallback).toBe(false)
    })

    it('should indicate fallback usage for unknown models', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      const breakdown = calculateCostBreakdown(1000, 500, 'unknown-model')

      expect(breakdown.usedFallback).toBe(true)
      expect(breakdown.model).toBe('unknown-model')
      expect(breakdown.pricing).toEqual({ input: 0.15, output: 0.6 })
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should throw error for negative token counts', () => {
      expect(() => calculateCostBreakdown(-1, 500, 'gpt-4o')).toThrow(
        'Token counts cannot be negative'
      )
      expect(() => calculateCostBreakdown(1000, -1, 'gpt-4o')).toThrow(
        'Token counts cannot be negative'
      )
    })
  })

  describe('createTokenUsage', () => {
    it('should create token usage record with correct calculations', () => {
      const usage = createTokenUsage(1000, 500, 'gpt-4o')

      expect(usage.inputTokens).toBe(1000)
      expect(usage.outputTokens).toBe(500)
      expect(usage.totalTokens).toBe(1500)
      expect(usage.cost).toBe(0.015)
      expect(usage.model).toBe('gpt-4o')
      expect(usage.timestamp).toBeTypeOf('number')
      expect(usage.timestamp).toBeCloseTo(Date.now(), -2) // Within 100ms
    })
  })

  describe('extractTokenUsageFromResponse', () => {
    it('should extract token usage from OpenAI response', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      }

      const usage = extractTokenUsageFromResponse(response)
      expect(usage.inputTokens).toBe(100)
      expect(usage.outputTokens).toBe(50)
    })

    it('should handle missing usage information', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation()
      const response = {}

      const usage = extractTokenUsageFromResponse(response)
      expect(usage.inputTokens).toBe(0)
      expect(usage.outputTokens).toBe(0)
      expect(consoleSpy).toHaveBeenCalledWith(
        'No usage information in OpenAI response'
      )
    })

    it('should handle partial usage information', () => {
      const response = {
        usage: {
          prompt_tokens: 100,
          // completion_tokens missing
        },
      }

      const usage = extractTokenUsageFromResponse(response)
      expect(usage.inputTokens).toBe(100)
      expect(usage.outputTokens).toBe(0)
    })
  })

  describe('estimateChatCost', () => {
    it('should estimate cost for chat completion', () => {
      const messages = [
        { role: 'user', content: 'Hello world' }, // ~3 tokens + overhead
        { role: 'assistant', content: 'Hi there!' }, // ~3 tokens + overhead
      ]

      const estimate = estimateChatCost(messages, 'gpt-4o')

      expect(estimate.estimatedInputTokens).toBe(14) // (3+4) + (3+4) = 14
      expect(estimate.estimatedOutputTokens).toBe(150) // Default
      expect(estimate.estimatedInputCost).toBeCloseTo(0.00007, 6) // 14 * 5.0 / 1M
      expect(estimate.estimatedOutputCost).toBeCloseTo(0.003, 6) // 150 * 20.0 / 1M
      expect(estimate.estimatedTotalCost).toBeCloseTo(0.00307, 6)
      expect(estimate.maxPossibleCost).toBeGreaterThan(
        estimate.estimatedTotalCost
      )
    })

    it('should use custom maxTokens when provided', () => {
      const messages = [{ role: 'user', content: 'Hello' }]
      const estimate = estimateChatCost(messages, 'gpt-4o', 100)

      expect(estimate.estimatedOutputTokens).toBe(100)
      expect(estimate.maxPossibleCost).toBe(estimate.estimatedTotalCost) // Same since maxTokens = estimatedOutputTokens
    })
  })

  describe('compareModelCosts', () => {
    it('should compare costs across different models', () => {
      const comparison = compareModelCosts(1000, 500, [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4',
      ])

      expect(comparison).toHaveLength(3)
      expect(comparison[0].model).toBe('gpt-4o-mini') // Cheapest
      expect(comparison[0].cost).toBe(0.00045)
      expect(comparison[1].model).toBe('gpt-4o')
      expect(comparison[1].cost).toBe(0.015)
      expect(comparison[2].model).toBe('gpt-4') // Most expensive
      expect(comparison[2].cost).toBe(0.06)

      // Should be sorted by cost (ascending)
      expect(comparison[0].cost).toBeLessThan(comparison[1].cost)
      expect(comparison[1].cost).toBeLessThan(comparison[2].cost)
    })

    it('should include breakdown information', () => {
      const comparison = compareModelCosts(1000, 500, ['gpt-4o'])

      expect(comparison[0].breakdown.inputCost).toBe(0.005)
      expect(comparison[0].breakdown.outputCost).toBe(0.01)
      expect(comparison[0].breakdown.totalCost).toBe(0.015)
    })

    it('should handle empty model list', () => {
      const comparison = compareModelCosts(1000, 500, [])
      expect(comparison).toHaveLength(0)
    })
  })

  describe('2025 Pricing Accuracy', () => {
    it('should have updated 2025 pricing for all models', () => {
      // Verify key models have expected 2025 pricing
      expect(getModelPricing('gpt-4o')).toEqual({ input: 5.0, output: 20.0 })
      expect(getModelPricing('gpt-4o-mini')).toEqual({
        input: 0.15,
        output: 0.6,
      })
      expect(getModelPricing('gpt-4-32k')).toEqual({
        input: 60.0,
        output: 120.0,
      })
      expect(getModelPricing('gpt-4-turbo')).toEqual({
        input: 10.0,
        output: 30.0,
      })
    })

    it('should calculate realistic costs for typical usage', () => {
      // Test realistic usage scenario: 2000 input tokens, 800 output tokens
      const gpt4oCost = calculateCost(2000, 800, 'gpt-4o')
      const gpt4oMiniCost = calculateCost(2000, 800, 'gpt-4o-mini')

      // GPT-4o: (2000 * 5 + 800 * 20) / 1M = 0.026
      expect(gpt4oCost).toBeCloseTo(0.026, 6)

      // GPT-4o-mini: (2000 * 0.15 + 800 * 0.6) / 1M = 0.00078
      expect(gpt4oMiniCost).toBeCloseTo(0.00078, 6)

      // GPT-4o-mini should be significantly cheaper (about 33x cheaper)
      expect(gpt4oCost / gpt4oMiniCost).toBeCloseTo(33.33, 1)
    })
  })
})
