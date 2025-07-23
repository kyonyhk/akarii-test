// Application constants
export const APP_NAME = 'Akarii'
export const APP_DESCRIPTION = 'AI-powered real-time message analysis platform'

export const API_ENDPOINTS = {
  MESSAGES: '/api/messages',
  ANALYSES: '/api/analyses',
  CONVERSATIONS: '/api/conversations',
  AUTH: '/api/auth',
} as const

export const ANALYSIS_TYPES = {
  QUESTION: 'question',
  OPINION: 'opinion',
  FACT: 'fact',
  REQUEST: 'request',
  OTHER: 'other',
} as const

export const USER_ROLES = {
  MEMBER: 'member',
  ADMIN: 'admin',
} as const

export const VOTE_TYPES = {
  UP: 'up',
  DOWN: 'down',
} as const
