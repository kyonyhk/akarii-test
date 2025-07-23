import { describe, it, expect } from 'vitest'
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT_TEMPLATE,
  TEST_MESSAGES,
  EXPECTED_RESPONSE_SCHEMA,
} from '../../convex/prompts'

describe('Prompt Templates', () => {
  describe('System Prompt', () => {
    it('should contain key analysis instructions', () => {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('Statement Type Classification')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('Beliefs Extraction')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('Trade-offs Identification')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('Confidence Assessment')
    })

    it('should specify JSON formatting requirements', () => {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('ONLY with valid JSON')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('exact field names')
    })

    it('should include all statement types', () => {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('question')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('opinion')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('fact')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('request')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('other')
    })

    it('should specify array length limits', () => {
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('max 10 words')
      expect(ANALYSIS_SYSTEM_PROMPT).toContain('1-3 items')
    })
  })

  describe('User Prompt Template', () => {
    it('should properly format message content', () => {
      const testMessage = 'This is a test message'
      const prompt = ANALYSIS_USER_PROMPT_TEMPLATE(testMessage)

      expect(prompt).toContain(`"${testMessage}"`)
      expect(prompt).toContain('Analyze this message')
    })

    it('should include JSON schema requirements', () => {
      const prompt = ANALYSIS_USER_PROMPT_TEMPLATE('test')

      expect(prompt).toContain('Required JSON format')
      expect(prompt).toContain('statement_type')
      expect(prompt).toContain('beliefs')
      expect(prompt).toContain('trade_offs')
      expect(prompt).toContain('confidence_level')
      expect(prompt).toContain('reasoning')
    })

    it('should handle empty messages', () => {
      const prompt = ANALYSIS_USER_PROMPT_TEMPLATE('')

      expect(prompt).toContain('""')
      expect(prompt).toContain('ONLY the JSON object')
    })

    it('should handle messages with special characters', () => {
      const specialMessage = 'Test with "quotes" and \\backslashes'
      const prompt = ANALYSIS_USER_PROMPT_TEMPLATE(specialMessage)

      expect(prompt).toContain(specialMessage)
    })

    it('should maintain formatting instructions', () => {
      const prompt = ANALYSIS_USER_PROMPT_TEMPLATE('test')

      expect(prompt).toContain('Respond with ONLY the JSON object')
      expect(prompt).toContain('No additional text or formatting')
      expect(prompt).toContain('Ensure all fields are present')
    })
  })

  describe('Test Messages', () => {
    it('should provide diverse message types', () => {
      expect(TEST_MESSAGES).toHaveProperty('question')
      expect(TEST_MESSAGES).toHaveProperty('opinion')
      expect(TEST_MESSAGES).toHaveProperty('fact')
      expect(TEST_MESSAGES).toHaveProperty('request')
      expect(TEST_MESSAGES).toHaveProperty('complex')
    })

    it('should have realistic content for each type', () => {
      expect(TEST_MESSAGES.question).toContain('?')
      expect(TEST_MESSAGES.opinion).toContain('think')
      expect(TEST_MESSAGES.fact).toContain('Next.js')
      expect(TEST_MESSAGES.request).toContain('please')
      expect(TEST_MESSAGES.complex.length).toBeGreaterThan(100)
    })
  })

  describe('Response Schema', () => {
    it('should define all required fields', () => {
      expect(EXPECTED_RESPONSE_SCHEMA).toHaveProperty('statement_type')
      expect(EXPECTED_RESPONSE_SCHEMA).toHaveProperty('beliefs')
      expect(EXPECTED_RESPONSE_SCHEMA).toHaveProperty('trade_offs')
      expect(EXPECTED_RESPONSE_SCHEMA).toHaveProperty('confidence_level')
      expect(EXPECTED_RESPONSE_SCHEMA).toHaveProperty('reasoning')
    })

    it('should specify valid statement types', () => {
      expect(EXPECTED_RESPONSE_SCHEMA.statement_type).toContain('question')
      expect(EXPECTED_RESPONSE_SCHEMA.statement_type).toContain('opinion')
      expect(EXPECTED_RESPONSE_SCHEMA.statement_type).toContain('fact')
      expect(EXPECTED_RESPONSE_SCHEMA.statement_type).toContain('request')
      expect(EXPECTED_RESPONSE_SCHEMA.statement_type).toContain('other')
    })

    it('should specify array types for beliefs and trade_offs', () => {
      expect(EXPECTED_RESPONSE_SCHEMA.beliefs).toBe('array')
      expect(EXPECTED_RESPONSE_SCHEMA.trade_offs).toBe('array')
    })

    it('should specify correct data types', () => {
      expect(EXPECTED_RESPONSE_SCHEMA.confidence_level).toBe('number')
      expect(EXPECTED_RESPONSE_SCHEMA.reasoning).toBe('string')
    })
  })
})
