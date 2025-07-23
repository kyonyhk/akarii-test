// Global type definitions for the Akarii application
// These align with Convex schema definitions

import { Id } from '../convex/_generated/dataModel'

export interface Message {
  _id: Id<'messages'>
  content: string
  userId: string
  conversationId: string
  timestamp: number
  analysisId?: Id<'analyses'>
}

export interface Analysis {
  _id: Id<'analyses'>
  messageId: Id<'messages'>
  statementType: 'question' | 'opinion' | 'fact' | 'request' | 'other'
  beliefs: string[]
  tradeOffs: string[]
  confidenceLevel: number
  rawData: any
  thumbsUp: number
  thumbsDown: number
  userVotes: Record<string, 'up' | 'down'>
  createdAt: number
}

export interface Conversation {
  _id: Id<'conversations'>
  title: string
  participants: string[]
  createdAt: number
  updatedAt: number
  isActive: boolean
}

export interface User {
  _id: Id<'users'>
  email: string
  name?: string
  avatar?: string
  role: 'member' | 'admin'
  joinedAt: number
}

export interface Team {
  _id: Id<'teams'>
  name: string
  members: string[] // User IDs
  createdAt: number
}

export interface InviteLink {
  _id: Id<'inviteLinks'>
  teamId: Id<'teams'>
  token: string
  expiresAt: number
  createdBy: string
  isActive: boolean
}

export interface UsageMetrics {
  _id: Id<'usageMetrics'>
  teamId: Id<'teams'>
  userId: string
  tokensUsed: number
  cost: number
  requestCount: number
  date: number
}

// Helper types for form inputs and API responses
export type CreateMessageInput = Omit<
  Message,
  '_id' | 'timestamp' | 'analysisId'
>
export type CreateAnalysisInput = Omit<
  Analysis,
  '_id' | 'createdAt' | 'thumbsUp' | 'thumbsDown' | 'userVotes'
>
export type CreateConversationInput = Omit<
  Conversation,
  '_id' | 'createdAt' | 'updatedAt'
>

// Vote types
export type VoteType = 'up' | 'down'

// Analysis statement types
export type StatementType =
  | 'question'
  | 'opinion'
  | 'fact'
  | 'request'
  | 'other'

// User roles
export type UserRole = 'member' | 'admin'

// Export analysis types
export * from './analysis'
