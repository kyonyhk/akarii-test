import { useEffect, useCallback, useMemo } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface PresenceData {
  name?: string
  avatar?: string
  isTyping?: boolean
  conversationId?: string
}

interface UserPresence {
  user: string
  data: PresenceData
  lastSeen: number
}

export function usePresence(conversationId: string) {
  const { user } = useUser()
  const updatePresence = useMutation(api.presence.updatePresence)
  const removePresence = useMutation(api.presence.removePresence)
  const roomPresence = useQuery(api.presence.getRoomPresence, {
    room: conversationId,
  })

  const userId = user?.id

  // Update presence data
  const setPresence = useCallback(
    async (data: Partial<PresenceData>) => {
      if (!userId) return

      const presenceData: PresenceData = {
        name: user?.fullName || user?.firstName || 'Anonymous',
        avatar: user?.imageUrl,
        conversationId,
        ...data,
      }

      try {
        await updatePresence({
          room: conversationId,
          user: userId,
          data: presenceData,
        })
      } catch (error) {
        console.error('Failed to update presence:', error)
      }
    },
    [userId, user, conversationId, updatePresence]
  )

  // Remove presence when leaving
  const clearPresence = useCallback(async () => {
    if (!userId) return

    try {
      await removePresence({
        room: conversationId,
        user: userId,
      })
    } catch (error) {
      console.error('Failed to clear presence:', error)
    }
  }, [userId, conversationId, removePresence])

  // Set initial presence on mount
  useEffect(() => {
    if (userId) {
      setPresence({})
    }
  }, [userId, setPresence])

  // Heartbeat to keep presence alive
  useEffect(() => {
    if (!userId) return

    const heartbeat = setInterval(() => {
      setPresence({})
    }, 15000) // Send heartbeat every 15 seconds

    return () => clearInterval(heartbeat)
  }, [userId, setPresence])

  // Clean up presence on unmount
  useEffect(() => {
    return () => {
      if (userId) {
        clearPresence()
      }
    }
  }, [clearPresence, userId])

  // Get other users (excluding current user)
  const otherUsers = useMemo(() => {
    if (!roomPresence || !userId) return []

    return roomPresence
      .filter((presence: UserPresence) => presence.user !== userId)
      .map((presence: UserPresence) => ({
        id: presence.user,
        name: presence.data.name || 'Anonymous',
        avatar: presence.data.avatar,
        isTyping: presence.data.isTyping || false,
        lastSeen: presence.lastSeen,
        isOnline: Date.now() - presence.lastSeen < 30000, // Online if seen within 30 seconds
      }))
  }, [roomPresence, userId])

  // Get current user's presence
  const myPresence = useMemo(() => {
    if (!roomPresence || !userId) return null

    const presence = roomPresence.find((p: UserPresence) => p.user === userId)
    return presence ? presence.data : null
  }, [roomPresence, userId])

  return {
    otherUsers,
    myPresence,
    setPresence,
    clearPresence,
    isLoading: roomPresence === undefined,
  }
}
