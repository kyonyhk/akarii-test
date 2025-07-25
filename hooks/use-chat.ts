'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface UseChatProps {
  conversationId: string
  userId: string
  userName?: string
}

export function useChat({ conversationId, userId, userName }: UseChatProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Real-time messages subscription with user information
  const messages = useQuery(api.messages.getMessagesWithUsers, {
    conversationId,
    limit: 100,
  })

  // Send message mutation
  const sendMessageMutation = useMutation(api.messages.sendMessage)

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    setIsLoading(true)
    try {
      await sendMessageMutation({
        content: content.trim(),
        userId,
        conversationId,
        username: userName,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages: messages || [],
    sendMessage,
    isLoading,
    isConnected: messages !== undefined,
  }
}
