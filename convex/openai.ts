'use node'

import OpenAI from 'openai'

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Export the configured client
export { openai }

// Model configuration for message analysis
export const ANALYSIS_MODEL = 'gpt-4o' // Using GPT-4o for better analysis quality
export const MAX_TOKENS = 500
export const TEMPERATURE = 0.1 // Low temperature for consistent, structured responses

// Validation function to check if OpenAI is properly configured
export function validateOpenAIConfig(): boolean {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set')
    return false
  }

  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error(
      'OPENAI_API_KEY appears to be invalid (should start with sk-)'
    )
    return false
  }

  return true
}
