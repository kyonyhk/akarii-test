'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface UseChatProps {
  conversationId: string
  userId: string
}

export function useChat({ conversationId, userId }: UseChatProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Real-time messages subscription
  const messages = useQuery(api.messages.getMessages, {
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
