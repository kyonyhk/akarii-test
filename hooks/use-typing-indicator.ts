import { useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useUser } from '@clerk/nextjs'

interface UseTypingIndicatorProps {
  conversationId: string
  enabled?: boolean
}

export function useTypingIndicator({
  conversationId,
  enabled = true,
}: UseTypingIndicatorProps) {
  const { user } = useUser()
  const setTypingStatus = useMutation(api.presence.setTypingStatus)
  const typingUsers = useQuery(
    api.presence.getTypingStatus,
    enabled ? { conversationId } : 'skip'
  )

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  // Debounced function to start typing
  const startTyping = useCallback(async () => {
    if (!user?.id || !enabled) return

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // If not already typing, set typing status to true
    if (!isTypingRef.current) {
      isTypingRef.current = true
      try {
        await setTypingStatus({
          conversationId,
          userId: user.id,
          isTyping: true,
        })
      } catch (error) {
        console.error('Failed to set typing status:', error)
      }
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      if (isTypingRef.current) {
        isTypingRef.current = false
        try {
          await setTypingStatus({
            conversationId,
            userId: user.id,
            isTyping: false,
          })
        } catch (error) {
          console.error('Failed to clear typing status:', error)
        }
      }
    }, 2000)
  }, [conversationId, user?.id, setTypingStatus, enabled])

  // Function to stop typing immediately
  const stopTyping = useCallback(async () => {
    if (!user?.id || !enabled) return

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    // Set typing status to false
    if (isTypingRef.current) {
      isTypingRef.current = false
      try {
        await setTypingStatus({
          conversationId,
          userId: user.id,
          isTyping: false,
        })
      } catch (error) {
        console.error('Failed to clear typing status:', error)
      }
    }
  }, [conversationId, user?.id, setTypingStatus, enabled])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Stop typing when component unmounts
      if (isTypingRef.current && user?.id) {
        setTypingStatus({
          conversationId,
          userId: user.id,
          isTyping: false,
        }).catch(console.error)
      }
    }
  }, [conversationId, user?.id, setTypingStatus])

  // Filter out current user from typing users
  const otherTypingUsers =
    typingUsers?.filter(typingUser => typingUser.userId !== user?.id) || []

  return {
    startTyping,
    stopTyping,
    typingUsers: otherTypingUsers,
    isTyping: isTypingRef.current,
  }
}
