// Test setup and global configurations
import { vi } from 'vitest'

// Mock environment variables for testing
process.env.OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || 'sk-test-key-for-testing'
// @ts-ignore - Allow setting NODE_ENV for testing
process.env.NODE_ENV = 'test'

// Global test utilities
declare global {
  var mockOpenAI: {
    chat: {
      completions: {
        create: ReturnType<typeof vi.fn>
      }
    }
  }
}

// Mock console methods to reduce test output noise
globalThis.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
}

// Sample test data that can be reused across tests
export const TEST_MESSAGES = {
  question: "What's the best way to implement real-time features in a web app?",
  opinion:
    'I think TypeScript is overengineered for small projects and adds unnecessary complexity.',
  fact: 'The latest version of Next.js includes built-in support for React Server Components.',
  request: 'Could you please review the pull request I submitted yesterday?',
  complex:
    "While I appreciate the benefits of microservices architecture, I'm concerned about the operational overhead it would introduce to our small team. We might be better off with a modular monolith for now.",
  empty: '',
  long: 'A'.repeat(1000), // Very long message for testing
}

export const MOCK_ANALYSIS_RESPONSE = {
  statement_type: 'opinion' as const,
  beliefs: ['TypeScript adds complexity', 'Small projects need simplicity'],
  trade_offs: [
    'Type safety vs development speed',
    'Learning curve vs productivity',
  ],
  confidence_level: 85,
  reasoning:
    'The message expresses a clear opinion about TypeScript with specific concerns about complexity for small projects.',
}

// Mock OpenAI response structure
export const MOCK_OPENAI_RESPONSE = {
  choices: [
    {
      message: {
        content: JSON.stringify(MOCK_ANALYSIS_RESPONSE),
      },
    },
  ],
}
