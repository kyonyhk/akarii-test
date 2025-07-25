// Context-aware analysis functions for preserving conversation context

import { Doc } from './_generated/dataModel'
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT_TEMPLATE,
  PROMPT_VARIATIONS,
} from './prompts'

export interface ConversationContext {
  previousMessages: string[]
  participants: string[]
  topic?: string
  conversationId?: string
}

export interface ContextAnalysisOptions {
  maxContextMessages?: number
  includeParticipants?: boolean
  useContextAwarePrompt?: boolean
}

/**
 * Enhanced analysis prompt that includes conversation context for better accuracy
 */
export const CONTEXT_ENHANCED_SYSTEM_PROMPT = `${ANALYSIS_SYSTEM_PROMPT}

## CONTEXT INTEGRATION GUIDELINES

### Conversation Context Usage:
When previous messages or conversation context is provided:

1. **Belief Extraction Enhancement**:
   - Consider recurring themes or assumptions across messages
   - Identify conversational patterns that reveal deeper beliefs
   - Note consistency or evolution of viewpoints within the conversation

2. **Trade-off Analysis Enhancement**:
   - Look for ongoing discussions about competing priorities
   - Identify trade-offs mentioned in previous context
   - Consider resource constraints or timing issues discussed earlier

3. **Statement Type Refinement**:
   - Use context to distinguish genuine vs. rhetorical questions
   - Identify when statements build on previous points (opinions/facts)
   - Recognize when requests reference earlier discussion

4. **Context Preservation Rules**:
   - Weight current message as 70% of analysis, context as 30%
   - Only use context that directly relates to current message
   - Don't assume relationships that aren't explicitly supported
   - Maintain focus on analyzing the current message, not the conversation

### Context Quality Indicators:
- **High context value**: When previous messages clarify ambiguous statements
- **Medium context value**: When context provides background but current message is clear
- **Low context value**: When context is unrelated or doesn't improve understanding

Adjust confidence based on context quality and relevance.`

/**
 * Creates context-aware user prompt by including relevant conversation history
 */
export function createContextAwarePrompt(
  messageContent: string,
  context?: ConversationContext,
  options: ContextAnalysisOptions = {}
): string {
  const {
    maxContextMessages = 5,
    includeParticipants = true,
    useContextAwarePrompt = true,
  } = options

  if (!context || !useContextAwarePrompt) {
    return ANALYSIS_USER_PROMPT_TEMPLATE(messageContent)
  }

  const contextMessages = context.previousMessages
    .slice(-maxContextMessages)
    .map((msg, index) => `[${index + 1}] ${msg}`)
    .join('\n')

  const participantInfo =
    includeParticipants && context.participants.length > 0
      ? `Participants: ${context.participants.join(', ')}\n`
      : ''

  const topicInfo = context.topic ? `Topic: ${context.topic}\n` : ''

  return `## MESSAGE TO ANALYZE
"${messageContent}"

## CONVERSATION CONTEXT
${topicInfo}${participantInfo}Previous Messages:
${contextMessages || 'No previous messages available'}

## CONTEXT-ENHANCED ANALYSIS INSTRUCTIONS

1. **Primary Analysis**: Focus on the current message (70% weight)
2. **Context Integration**: Use conversation history to resolve ambiguities (30% weight)
3. **Relationship Identification**: Note how current message relates to previous discussion
4. **Enhanced Belief/Trade-off Detection**: Look for patterns across messages

## CONTEXT USAGE RULES
- Only reference context when it clarifies the current message
- Don't analyze the conversation as a whole - focus on current message
- Use context to distinguish question types (genuine vs. rhetorical)
- Consider ongoing themes for belief/trade-off identification
- Adjust confidence based on context quality and relevance

## REQUIRED JSON FORMAT
{
  "statement_type": "question" | "opinion" | "fact" | "request" | "other",
  "beliefs": [
    "underlying belief or assumption 1",
    "underlying belief or assumption 2"
  ],
  "trade_offs": [
    "competing priority or tension 1", 
    "resource constraint or opportunity cost 2"
  ],
  "confidence_level": 75,
  "reasoning": "Analysis explanation including how context informed your interpretation"
}

## RESPONSE REQUIREMENTS
- JSON response only, no additional text
- Include context relevance in reasoning field
- Apply confidence calibration rules with context quality consideration
- Empty arrays [] if no clear beliefs/trade-offs identified
`
}

/**
 * Utility function to extract conversation context from message history
 */
export function extractConversationContext(
  messages: Doc<'messages'>[],
  currentMessageId: string,
  maxContext: number = 7
): ConversationContext {
  // Find current message index
  const currentIndex = messages.findIndex(m => m._id === currentMessageId)
  if (currentIndex === -1) {
    return { previousMessages: [], participants: [] }
  }

  // Get previous messages (excluding current)
  const previousMessages = messages
    .slice(Math.max(0, currentIndex - maxContext), currentIndex)
    .map(msg => msg.content)
    .filter(content => content.trim().length > 0)

  // Extract unique participants
  const participants = Array.from(
    new Set(
      messages
        .slice(Math.max(0, currentIndex - maxContext), currentIndex + 1)
        .map(msg => msg.author)
        .filter(author => author && author.trim().length > 0)
    )
  )

  return {
    previousMessages,
    participants,
    conversationId: messages[currentIndex]?.conversationId,
  }
}

/**
 * Context quality assessment for confidence adjustment
 */
export function assessContextQuality(
  messageContent: string,
  context: ConversationContext
): 'high' | 'medium' | 'low' {
  if (!context.previousMessages.length) return 'low'

  const currentWords = messageContent.toLowerCase().split(/\s+/)
  const contextText = context.previousMessages.join(' ').toLowerCase()

  // Count word overlaps between current message and context
  const overlaps = currentWords.filter(
    word => word.length > 3 && contextText.includes(word)
  ).length

  const overlapRatio = overlaps / Math.max(currentWords.length, 1)

  // Assess quality based on relevance indicators
  if (
    overlapRatio > 0.3 ||
    messageContent.includes('this') ||
    messageContent.includes('that') ||
    messageContent.includes('it')
  ) {
    return 'high'
  } else if (overlapRatio > 0.1 || context.previousMessages.length >= 3) {
    return 'medium'
  } else {
    return 'low'
  }
}

/**
 * Confidence adjustment based on context quality
 */
export function adjustConfidenceForContext(
  baseConfidence: number,
  contextQuality: 'high' | 'medium' | 'low'
): number {
  switch (contextQuality) {
    case 'high':
      return Math.min(100, baseConfidence + 5) // Context helps clarify
    case 'medium':
      return baseConfidence // No adjustment
    case 'low':
      return Math.max(0, baseConfidence - 3) // Less context available
    default:
      return baseConfidence
  }
}
