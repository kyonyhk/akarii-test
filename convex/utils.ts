import { Id, TableNames } from './_generated/dataModel'

// Utility functions for working with Convex data

export function getCurrentTimestamp(): number {
  return Date.now()
}

export function isValidId<T extends TableNames>(
  id: string,
  tableName: T
): id is Id<T> {
  return typeof id === 'string' && id.length > 0
}

export function createTimestampRange(
  startDate: Date,
  endDate: Date
): { start: number; end: number } {
  return {
    start: startDate.getTime(),
    end: endDate.getTime(),
  }
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

// Vote helpers
export function initializeVoteCounts() {
  return {
    thumbsUp: 0,
    thumbsDown: 0,
    userVotes: [],
  }
}

export function calculateVoteScore(
  thumbsUp: number,
  thumbsDown: number
): number {
  const total = thumbsUp + thumbsDown
  return total === 0 ? 0 : thumbsUp / total
}

// Analysis helpers
export const STATEMENT_TYPES = [
  'question',
  'opinion',
  'fact',
  'request',
  'other',
] as const

export function isValidStatementType(
  type: string
): type is (typeof STATEMENT_TYPES)[number] {
  return STATEMENT_TYPES.includes(type as any)
}

export function validateConfidenceLevel(level: number): boolean {
  return level >= 0 && level <= 1
}

// User role helpers
export const USER_ROLES = ['member', 'admin'] as const

export function isValidUserRole(
  role: string
): role is (typeof USER_ROLES)[number] {
  return USER_ROLES.includes(role as any)
}

// Conversation helpers
export function generateConversationTitle(
  firstMessage: string,
  maxLength = 50
): string {
  const cleaned = firstMessage.trim().replace(/\s+/g, ' ')
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + '...'
    : cleaned
}
