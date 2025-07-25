import type { Message, Analysis, User } from './index'

export type ExportFormat = 'json' | 'markdown' | 'pdf'

// Compatible with SearchResult interface from search-results.tsx
export interface ExportableMessage {
  message: {
    _id: string
    content: string
    timestamp: number
    conversationId: string
    user?: {
      name: string
      email: string
      avatar?: string
      role?: string
    }
  }
  analysis?: {
    statementType: string
    beliefs: string[]
    tradeOffs: string[]
    confidenceLevel: number
    thumbsUp: number
    thumbsDown: number
  }
  matchType?: string
}

export interface ExportData {
  metadata: {
    exportedAt: string
    totalCount: number
    filters?: any
    exportFormat: ExportFormat
    generatedBy: string
  }
  data: ExportableMessage[]
}

export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeMetadata?: boolean
  includeAnalysis?: boolean
  includeRawData?: boolean
}

export interface ExportFilters {
  searchTerm?: string
  conversationId?: string
  userId?: string
  statementTypes?: string[]
  confidenceRange?: [number, number]
  dateRange?: {
    start?: Date
    end?: Date
  }
  minVotes?: number
  hasAnalysis?: boolean
  searchInBeliefs?: boolean
  searchInTradeOffs?: boolean
}
