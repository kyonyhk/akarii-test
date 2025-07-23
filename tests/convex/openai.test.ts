import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateOpenAIConfig,
  ANALYSIS_MODEL,
  MAX_TOKENS,
  TEMPERATURE,
} from '../../convex/openai'

describe('OpenAI Configuration', () => {
  const originalApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    // Reset environment
    process.env.OPENAI_API_KEY = originalApiKey
  })

  describe('validateOpenAIConfig', () => {
    it('should return true for valid API key', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-1234567890'

      const isValid = validateOpenAIConfig()
      expect(isValid).toBe(true)
    })

    it('should return false when API key is missing', () => {
      delete process.env.OPENAI_API_KEY

      const isValid = validateOpenAIConfig()
      expect(isValid).toBe(false)
    })

    it('should return false for invalid API key format', () => {
      process.env.OPENAI_API_KEY = 'invalid-key-format'

      const isValid = validateOpenAIConfig()
      expect(isValid).toBe(false)
    })

    it('should return false for empty API key', () => {
      process.env.OPENAI_API_KEY = ''

      const isValid = validateOpenAIConfig()
      expect(isValid).toBe(false)
    })
  })

  describe('Model Configuration', () => {
    it('should use correct model for analysis', () => {
      expect(ANALYSIS_MODEL).toBe('gpt-4o-mini')
    })

    it('should have appropriate token limits', () => {
      expect(MAX_TOKENS).toBe(500)
      expect(MAX_TOKENS).toBeGreaterThan(0)
      expect(MAX_TOKENS).toBeLessThan(1000) // Reasonable limit for analysis
    })

    it('should use low temperature for consistent responses', () => {
      expect(TEMPERATURE).toBe(0.1)
      expect(TEMPERATURE).toBeGreaterThanOrEqual(0)
      expect(TEMPERATURE).toBeLessThanOrEqual(1)
    })
  })
})
