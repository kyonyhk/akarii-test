'use client'

import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
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

  // Analysis action with database storage
  const analyzeMessageAction = useAction(api.actions.analyzeAndStoreMessage)

  const sendMessage = async (content: string) => {
    if (!content.trim()) return

    setIsLoading(true)
    try {
      // Send the message first
      const messageId = await sendMessageMutation({
        content: content.trim(),
        userId,
        conversationId,
        username: userName,
      })

      // Trigger analysis asynchronously (don't wait for it)
      analyzeMessageAction({
        messageId,
        content: content.trim(),
        userId,
        conversationId,
      }).catch(error => {
        console.error('Failed to analyze message:', error)
        // Don't throw here - analysis failure shouldn't prevent message sending
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
