// Types for message analysis pipeline

export type StatementType =
  | 'question'
  | 'opinion'
  | 'fact'
  | 'request'
  | 'other'

export interface MessageAnalysis {
  statementType: StatementType
  beliefs: string[]
  tradeOffs: string[]
  confidenceLevel: number // 0-100
  rawData: {
    originalMessage: string
    analysisTimestamp: number
    modelUsed: string
    processingTimeMs?: number
    cached?: boolean
    blocked?: boolean
    blockReason?: string
    tokenUsage?: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
      cost: number
    }
  }
}

export interface AnalysisRequest {
  messageId: string
  content: string
  userId: string
  conversationId: string
}

export interface AnalysisResponse extends MessageAnalysis {
  messageId: string
  success: boolean
  error?: string
  errorCode?: string
  requiresApproval?: boolean
  displayMode?: 'normal' | 'warning' | 'hidden' | 'review_pending'
  qualityWarnings?: string[]
}

// OpenAI API response structure
export interface OpenAIAnalysisResponse {
  statement_type: StatementType
  beliefs: string[]
  trade_offs: string[]
  confidence_level: number
  reasoning?: string
}
