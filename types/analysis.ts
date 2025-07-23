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
}

// OpenAI API response structure
export interface OpenAIAnalysisResponse {
  statement_type: StatementType
  beliefs: string[]
  trade_offs: string[]
  confidence_level: number
  reasoning?: string
}
