'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface UseConversationsProps {
  userId: string
}

export function useConversations({ userId }: UseConversationsProps) {
  // Real-time conversations subscription
  const conversations = useQuery(api.conversations.getConversations, {
    userId,
    includeInactive: false,
  })

  // Create conversation mutation
  const createConversationMutation = useMutation(
    api.conversations.createConversation
  )

  const createConversation = async (title: string, participants: string[]) => {
    try {
      const conversationId = await createConversationMutation({
        title,
        participants,
        createdBy: userId,
      })
      return conversationId
    } catch (error) {
      console.error('Failed to create conversation:', error)
      throw error
    }
  }

  return {
    conversations: conversations || [],
    createConversation,
    isLoading: conversations === undefined,
  }
}
