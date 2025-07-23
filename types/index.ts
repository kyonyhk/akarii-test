// Global type definitions for the Akarii application

export interface Message {
  id: string
  content: string
  userId: string
  conversationId: string
  timestamp: Date
  analysisId?: string
}

export interface Analysis {
  id: string
  messageId: string
  statementType: 'question' | 'opinion' | 'fact' | 'request' | 'other'
  beliefs: string[]
  tradeOffs: string[]
  confidenceLevel: number
  rawData: Record<string, unknown>
  thumbsUp: number
  thumbsDown: number
  userVotes: Record<string, 'up' | 'down'>
  createdAt: Date
}

export interface Conversation {
  id: string
  title: string
  participants: string[]
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: 'member' | 'admin'
  joinedAt: Date
}

export interface Team {
  id: string
  name: string
  members: User[]
  inviteLinks: InviteLink[]
  createdAt: Date
}

export interface InviteLink {
  id: string
  teamId: string
  token: string
  expiresAt: Date
  createdBy: string
  isActive: boolean
}

export interface UsageMetrics {
  id: string
  teamId: string
  userId: string
  tokensUsed: number
  cost: number
  requestCount: number
  date: Date
}
