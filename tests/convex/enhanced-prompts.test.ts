import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSystemPrompt,
  getUserPrompt,
  validateStructuredOutput,
  formatAnalysisOutput,
  applyConfidenceCalibration,
  DEFAULT_PRODUCTION_CONFIG,
  QUESTION_FOCUSED_TEST_CONFIG,
  PromptConfiguration,
} from '../../convex/promptConfig'
import {
  createContextAwarePrompt,
  extractConversationContext,
  assessContextQuality,
  adjustConfidenceForContext,
  ConversationContext,
} from '../../convex/contextAnalysis'
import { TEST_MESSAGES } from '../../convex/prompts'

describe('Enhanced Prompt System', () => {
  describe('Prompt Configuration', () => {
    it('should generate standard system prompt for default config', () => {
      const systemPrompt = getSystemPrompt(DEFAULT_PRODUCTION_CONFIG)
      expect(systemPrompt).toContain('expert communication analyst')
      expect(systemPrompt).toContain('ANALYSIS FRAMEWORK')
      expect(systemPrompt).toContain('Statement Type Classification')
    })

    it('should generate question-focused system prompt for question config', () => {
      const systemPrompt = getSystemPrompt(QUESTION_FOCUSED_TEST_CONFIG)
      expect(systemPrompt).toContain(
        'specialized training in question analysis'
      )
      expect(systemPrompt).toContain('ENHANCED QUESTION ANALYSIS FRAMEWORK')
      expect(systemPrompt).toContain('Question Type Classification')
    })

    it('should generate appropriate user prompts for different configurations', () => {
      const message = "What's the best approach for this?"

      const standardPrompt = getUserPrompt(message, DEFAULT_PRODUCTION_CONFIG)
      expect(standardPrompt).toContain('MESSAGE TO ANALYZE')
      expect(standardPrompt).toContain('Chain-of-Thought Reasoning')

      const questionPrompt = getUserPrompt(
        message,
        QUESTION_FOCUSED_TEST_CONFIG
      )
      expect(questionPrompt).toContain(message)
    })
  })

  describe('Context Analysis', () => {
    const mockMessages = [
      {
        _id: 'msg1',
        content: 'Hello everyone',
        author: 'Alice',
        conversationId: 'conv1',
      },
      {
        _id: 'msg2',
        content: 'How are you doing?',
        author: 'Bob',
        conversationId: 'conv1',
      },
      {
        _id: 'msg3',
        content: 'I think we should discuss the project',
        author: 'Alice',
        conversationId: 'conv1',
      },
      {
        _id: 'msg4',
        content: 'What do you think about the timeline?',
        author: 'Bob',
        conversationId: 'conv1',
      },
    ] as any[]

    it('should extract conversation context correctly', () => {
      const context = extractConversationContext(mockMessages, 'msg4', 3)

      expect(context.previousMessages).toHaveLength(3)
      expect(context.previousMessages).toContain('Hello everyone')
      expect(context.previousMessages).toContain('How are you doing?')
      expect(context.previousMessages).toContain(
        'I think we should discuss the project'
      )
      expect(context.participants).toContain('Alice')
      expect(context.participants).toContain('Bob')
    })

    it('should assess context quality correctly', () => {
      const context: ConversationContext = {
        previousMessages: [
          'We discussed the project timeline',
          'The deadline is approaching',
        ],
        participants: ['Alice', 'Bob'],
      }

      const highQualityMessage = 'What about the timeline we discussed?'
      const lowQualityMessage = 'Hello world'

      expect(assessContextQuality(highQualityMessage, context)).toBe('high')
      expect(assessContextQuality(lowQualityMessage, context)).toBe('low')
    })

    it('should adjust confidence based on context quality', () => {
      expect(adjustConfidenceForContext(70, 'high')).toBe(75)
      expect(adjustConfidenceForContext(70, 'medium')).toBe(70)
      expect(adjustConfidenceForContext(70, 'low')).toBe(67)
    })

    it('should create context-aware prompts', () => {
      const context: ConversationContext = {
        previousMessages: [
          'We need to decide on the architecture',
          'I prefer microservices',
        ],
        participants: ['Alice', 'Bob'],
        topic: 'Architecture Discussion',
      }

      const config: PromptConfiguration = {
        variant: 'context_aware',
        mode: 'testing',
        contextOptions: { useContextAwarePrompt: true },
      }

      const prompt = createContextAwarePrompt(
        'What are the trade-offs?',
        context,
        config.contextOptions
      )

      expect(prompt).toContain('CONVERSATION CONTEXT')
      expect(prompt).toContain('Architecture Discussion')
      expect(prompt).toContain('We need to decide on the architecture')
      expect(prompt).toContain('CONTEXT-ENHANCED ANALYSIS')
    })
  })

  describe('Output Validation', () => {
    it('should validate correct structured output', () => {
      const validOutput = {
        statement_type: 'question',
        beliefs: ['efficiency is important', 'scalability matters'],
        trade_offs: ['speed vs accuracy', 'cost vs quality'],
        confidence_level: 75,
        reasoning:
          'This is a clear question asking for technical guidance based on explicit question markers.',
      }

      const result = validateStructuredOutput(validOutput)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedOutput).toBeDefined()
    })

    it('should reject invalid statement types', () => {
      const invalidOutput = {
        statement_type: 'invalid_type',
        beliefs: [],
        trade_offs: [],
        confidence_level: 50,
        reasoning: 'Test reasoning',
      }

      const result = validateStructuredOutput(invalidOutput)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('statement_type'))).toBe(true)
    })

    it('should validate array constraints', () => {
      const tooManyBeliefs = {
        statement_type: 'opinion',
        beliefs: ['belief1', 'belief2', 'belief3', 'belief4'], // Max 3 allowed
        trade_offs: [],
        confidence_level: 50,
        reasoning: 'Test reasoning',
      }

      const result = validateStructuredOutput(tooManyBeliefs)
      expect(result.isValid).toBe(false)
      expect(
        result.errors.some(e => e.includes('beliefs array has 4 items'))
      ).toBe(true)
    })

    it('should validate confidence level range', () => {
      const invalidConfidence = {
        statement_type: 'fact',
        beliefs: [],
        trade_offs: [],
        confidence_level: 150, // Invalid: > 100
        reasoning: 'Test reasoning',
      }

      const result = validateStructuredOutput(invalidConfidence)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('confidence_level'))).toBe(true)
    })

    it('should validate reasoning length', () => {
      const shortReasoning = {
        statement_type: 'request',
        beliefs: [],
        trade_offs: [],
        confidence_level: 80,
        reasoning: 'Too short', // < 20 characters
      }

      const result = validateStructuredOutput(shortReasoning)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('reasoning'))).toBe(true)
    })
  })

  describe('Confidence Calibration', () => {
    const baseOutput = {
      statement_type: 'question' as const,
      beliefs: ['learning is valuable'],
      trade_offs: ['time vs depth'],
      confidence_level: 90,
      reasoning: 'Clear question with explicit markers and good context.',
    }

    it('should reduce confidence for questions by 15%', () => {
      const result = applyConfidenceCalibration(
        baseOutput,
        DEFAULT_PRODUCTION_CONFIG
      )
      expect(result.confidence_level).toBe(75) // 90 - 15
    })

    it('should cap "other" category at 60%', () => {
      const otherOutput = { ...baseOutput, statement_type: 'other' as const }
      const result = applyConfidenceCalibration(
        otherOutput,
        DEFAULT_PRODUCTION_CONFIG
      )
      expect(result.confidence_level).toBe(60)
    })

    it('should apply additional adjustments for confidence-calibrated variant', () => {
      const config: PromptConfiguration = {
        variant: 'confidence_calibrated',
        mode: 'testing',
      }

      const emptyContentOutput = {
        ...baseOutput,
        beliefs: [],
        trade_offs: [],
        confidence_level: 80,
      }

      const result = applyConfidenceCalibration(emptyContentOutput, config)
      expect(result.confidence_level).toBe(55) // 80 - 15 (question) - 10 (empty content)
    })
  })

  describe('Quality Scoring', () => {
    it('should calculate high quality scores for complete analysis', () => {
      const goodOutput = {
        statement_type: 'question' as const,
        beliefs: ['learning is important', 'efficiency matters'],
        trade_offs: ['time vs quality', 'depth vs breadth'],
        confidence_level: 75,
        reasoning:
          'This is a clear question asking for information based on explicit question markers and context clues. The confidence level reflects historical calibration for question types.',
      }

      const result = formatAnalysisOutput(
        goodOutput,
        DEFAULT_PRODUCTION_CONFIG,
        150
      )
      expect(result.quality.score).toBeGreaterThan(80)
      expect(result.quality.factors).toContain('High quality analysis')
    })

    it('should penalize incomplete analysis', () => {
      const incompleteOutput = {
        statement_type: 'question' as const,
        beliefs: [], // Missing beliefs
        trade_offs: [], // Missing trade-offs
        confidence_level: 75,
        reasoning: 'Short', // Too short
      }

      const result = formatAnalysisOutput(
        incompleteOutput,
        DEFAULT_PRODUCTION_CONFIG,
        150
      )
      expect(result.quality.score).toBeLessThan(70)
      expect(result.quality.factors).toContain('No beliefs identified')
      expect(result.quality.factors).toContain('No trade-offs identified')
      expect(result.quality.factors).toContain('Short reasoning')
    })

    it('should penalize overconfidence', () => {
      const overconfidentOutput = {
        statement_type: 'question' as const,
        beliefs: ['assumption'],
        trade_offs: ['trade-off'],
        confidence_level: 95, // Too high for question
        reasoning:
          'This analysis is very certain about the question interpretation despite inherent ambiguity.',
      }

      const result = formatAnalysisOutput(
        overconfidentOutput,
        DEFAULT_PRODUCTION_CONFIG,
        150
      )
      expect(result.quality.factors).toContain('Overconfident on question')
    })
  })

  describe('Test Message Analysis', () => {
    it('should handle all test message types', () => {
      Object.entries(TEST_MESSAGES).forEach(([type, message]) => {
        const standardPrompt = getUserPrompt(message, DEFAULT_PRODUCTION_CONFIG)
        const questionPrompt = getUserPrompt(
          message,
          QUESTION_FOCUSED_TEST_CONFIG
        )

        expect(standardPrompt).toContain(message)
        expect(questionPrompt).toContain(message)

        // Each prompt should be substantial
        expect(standardPrompt.length).toBeGreaterThan(100)
        expect(questionPrompt.length).toBeGreaterThan(50)
      })
    })

    it('should generate context-aware prompts for complex messages', () => {
      const complexMessage = TEST_MESSAGES.complex_multi_faceted
      const context: ConversationContext = {
        previousMessages: [
          'We are evaluating different architectural approaches',
          'The team has limited DevOps experience',
        ],
        participants: ['Tech Lead', 'Developer'],
      }

      const config: PromptConfiguration = {
        variant: 'context_aware',
        mode: 'testing',
        contextOptions: {
          useContextAwarePrompt: true,
          maxContextMessages: 5,
          includeParticipants: true,
        },
      }

      const prompt = createContextAwarePrompt(
        complexMessage,
        context,
        config.contextOptions
      )

      expect(prompt).toContain('CONVERSATION CONTEXT')
      expect(prompt).toContain('limited DevOps experience')
      expect(prompt).toContain('CONTEXT-ENHANCED ANALYSIS')
      expect(prompt).toContain(complexMessage)
    })
  })

  describe('Integration Tests', () => {
    const configs = [
      DEFAULT_PRODUCTION_CONFIG,
      QUESTION_FOCUSED_TEST_CONFIG,
      { variant: 'confidence_calibrated' as const, mode: 'testing' as const },
      { variant: 'context_aware' as const, mode: 'testing' as const },
    ]

    configs.forEach(config => {
      it(`should work end-to-end with ${config.variant} configuration`, () => {
        const message = TEST_MESSAGES.genuine_question

        const systemPrompt = getSystemPrompt(config)
        const userPrompt = getUserPrompt(message, config)

        expect(systemPrompt).toBeTruthy()
        expect(userPrompt).toBeTruthy()
        expect(userPrompt).toContain(message)

        // Mock a typical OpenAI response
        const mockResponse = {
          statement_type: 'question',
          beliefs: ['best practices matter'],
          trade_offs: ['simplicity vs features'],
          confidence_level: 75,
          reasoning: 'Clear question asking for technical guidance.',
        }

        const result = formatAnalysisOutput(mockResponse, config, 200, 'medium')
        expect(result.validation.isValid).toBe(true)
        expect(result.output.metadata?.prompt_variant).toBe(config.variant)
      })
    })
  })
})
