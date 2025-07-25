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
  userVotes: Array<{
    userId: string
    voteType: 'up' | 'down'
    timestamp: number
  }>
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

export interface ConversationArchive {
  _id: Id<'conversationArchives'>
  conversationId: string
  title: string
  originalParticipants: string[]
  archivedBy: string
  archiveReason?: string
  archiveType: 'manual' | 'automatic' | 'bulk'
  status: 'archived' | 'processing' | 'failed'
  messageCount: number
  analysisCount: number
  timeRange: {
    startDate: number
    endDate: number
    duration: number
  }
  metadata: {
    tags: string[]
    category?: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    retentionPeriod?: number
    accessLevel: 'private' | 'participants' | 'team' | 'public'
  }
  archivedAt: number
  lastAccessedAt?: number
  accessCount: number
}

export interface ArchiveSummary {
  _id: Id<'archiveSummaries'>
  archiveId: Id<'conversationArchives'>
  summaryType: 'overview' | 'decisions' | 'insights' | 'sentiment' | 'topics'
  content: string
  keyPoints: string[]
  participants: Array<{
    userId: string
    name?: string
    messageCount: number
    participationLevel: 'low' | 'medium' | 'high'
  }>
  statistics: {
    totalMessages: number
    avgMessageLength: number
    questionCount: number
    opinionCount: number
    factCount: number
    requestCount: number
    sentimentScore?: number
    confidenceLevel: number
  }
  generatedAt: number
  generatedBy: string
  version: string
}

export interface ArchiveInsight {
  _id: Id<'archiveInsights'>
  archiveId: Id<'conversationArchives'>
  insightType:
    | 'decision_pattern'
    | 'communication_pattern'
    | 'topic_evolution'
    | 'conflict_resolution'
    | 'consensus_building'
    | 'knowledge_sharing'
  title: string
  description: string
  evidence: Array<{
    messageId: string
    excerpt: string
    timestamp: number
    relevanceScore: number
  }>
  patterns: Array<{
    pattern: string
    frequency: number
    significance: 'low' | 'medium' | 'high'
  }>
  recommendations: string[]
  confidence: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  generatedAt: number
  validatedBy?: string
  validatedAt?: number
  isActive: boolean
}

export interface ArchiveSearchIndex {
  _id: Id<'archiveSearchIndex'>
  archiveId: Id<'conversationArchives'>
  content: string
  contentType: 'message' | 'summary' | 'insight' | 'metadata'
  sourceId: string
  keywords: string[]
  createdAt: number
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

// Archive helper types
export type CreateArchiveInput = Omit<
  ConversationArchive,
  '_id' | 'archivedAt' | 'lastAccessedAt' | 'accessCount'
>
export type ArchiveStatus = ConversationArchive['status']
export type ArchiveType = ConversationArchive['archiveType']
export type SummaryType = ArchiveSummary['summaryType']
export type InsightType = ArchiveInsight['insightType']

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
