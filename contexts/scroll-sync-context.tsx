'use client'

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
} from 'react'

interface ScrollSyncState {
  activeMessageId: string | null
  isScrollSyncing: boolean
  chatScrollRef: React.RefObject<HTMLElement>
  analysisScrollRef: React.RefObject<HTMLElement>
}

interface ScrollSyncContextType extends ScrollSyncState {
  // Core sync methods
  syncToMessage: (messageId: string, source: 'chat' | 'analysis') => void
  setActiveMessage: (messageId: string | null) => void

  // Ref registration
  registerChatScroll: (ref: React.RefObject<HTMLElement>) => void
  registerAnalysisScroll: (ref: React.RefObject<HTMLElement>) => void

  // Scroll utilities
  scrollToMessage: (messageId: string, behavior?: ScrollBehavior) => void
  scrollToAnalysis: (messageId: string, behavior?: ScrollBehavior) => void

  // State management
  setSyncingState: (isSyncing: boolean) => void
}

const ScrollSyncContext = createContext<ScrollSyncContextType | null>(null)

interface ScrollSyncProviderProps {
  children: React.ReactNode
}

export function ScrollSyncProvider({ children }: ScrollSyncProviderProps) {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [isScrollSyncing, setIsScrollSyncing] = useState(false)

  // Refs to scroll containers
  const chatScrollRef = useRef<HTMLElement>(null)
  const analysisScrollRef = useRef<HTMLElement>(null)

  // Debounce timer for scroll events
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncTimeRef = useRef<number>(0)
  const pendingSyncRef = useRef<string | null>(null)

  const setSyncingState = useCallback((isSyncing: boolean) => {
    setIsScrollSyncing(isSyncing)
  }, [])

  const setActiveMessage = useCallback((messageId: string | null) => {
    setActiveMessageId(messageId)
  }, [])

  const registerChatScroll = useCallback(
    (ref: React.RefObject<HTMLElement>) => {
      if (ref.current) {
        chatScrollRef.current = ref.current
      }
    },
    []
  )

  const registerAnalysisScroll = useCallback(
    (ref: React.RefObject<HTMLElement>) => {
      if (ref.current) {
        analysisScrollRef.current = ref.current
      }
    },
    []
  )

  const scrollToMessage = useCallback(
    (messageId: string, behavior: ScrollBehavior = 'smooth') => {
      if (!chatScrollRef.current) return

      // Find message element by data attribute
      const messageElement = chatScrollRef.current.querySelector(
        `[data-message-id="${messageId}"]`
      ) as HTMLElement

      if (messageElement) {
        messageElement.scrollIntoView({
          behavior,
          block: 'center',
          inline: 'nearest',
        })
      }
    },
    []
  )

  const scrollToAnalysis = useCallback(
    (messageId: string, behavior: ScrollBehavior = 'smooth') => {
      if (!analysisScrollRef.current) return

      // Find analysis element by data attribute
      const analysisElement = analysisScrollRef.current.querySelector(
        `[data-analysis-message-id="${messageId}"]`
      ) as HTMLElement

      if (analysisElement) {
        analysisElement.scrollIntoView({
          behavior,
          block: 'center',
          inline: 'nearest',
        })
      }
    },
    []
  )

  const syncToMessage = useCallback(
    (messageId: string, source: 'chat' | 'analysis') => {
      const now = Date.now()

      // Prevent recursive syncing
      if (isScrollSyncing) {
        // Queue the sync for later if we're currently syncing but this is a new message
        if (messageId !== activeMessageId) {
          pendingSyncRef.current = messageId
        }
        return
      }

      // Rate limiting: prevent excessive syncing (max once per 100ms)
      if (now - lastSyncTimeRef.current < 100) {
        pendingSyncRef.current = messageId

        // Clear existing timer and set new one
        if (syncTimerRef.current) {
          clearTimeout(syncTimerRef.current)
        }

        syncTimerRef.current = setTimeout(
          () => {
            if (pendingSyncRef.current) {
              syncToMessage(pendingSyncRef.current, source)
              pendingSyncRef.current = null
            }
          },
          100 - (now - lastSyncTimeRef.current)
        )

        return
      }

      // Clear existing timer
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current)
      }

      // Update sync time and state
      lastSyncTimeRef.current = now
      setIsScrollSyncing(true)
      setActiveMessageId(messageId)

      // Perform the sync after a short delay to prevent flickering
      syncTimerRef.current = setTimeout(() => {
        // Double-check the elements exist before scrolling
        const hasValidTargets =
          (source === 'chat' && analysisScrollRef.current) ||
          (source === 'analysis' && chatScrollRef.current)

        if (hasValidTargets) {
          if (source === 'chat') {
            // Chat scrolled, sync analysis panel
            scrollToAnalysis(messageId)
          } else {
            // Analysis clicked, sync chat
            scrollToMessage(messageId)
          }
        }

        // Reset syncing state after animation completes
        setTimeout(() => {
          setIsScrollSyncing(false)

          // Process any pending sync request
          if (pendingSyncRef.current && pendingSyncRef.current !== messageId) {
            const pendingMessageId = pendingSyncRef.current
            pendingSyncRef.current = null
            syncToMessage(pendingMessageId, source)
          }
        }, 500) // Match smooth scroll duration
      }, 50)
    },
    [isScrollSyncing, scrollToAnalysis, scrollToMessage, activeMessageId]
  )

  const contextValue: ScrollSyncContextType = {
    // State
    activeMessageId,
    isScrollSyncing,
    chatScrollRef,
    analysisScrollRef,

    // Methods
    syncToMessage,
    setActiveMessage,
    registerChatScroll,
    registerAnalysisScroll,
    scrollToMessage,
    scrollToAnalysis,
    setSyncingState,
  }

  return (
    <ScrollSyncContext.Provider value={contextValue}>
      {children}
    </ScrollSyncContext.Provider>
  )
}

export function useScrollSync() {
  const context = useContext(ScrollSyncContext)
  if (!context) {
    throw new Error('useScrollSync must be used within a ScrollSyncProvider')
  }
  return context
}

// Hook for detecting which message is currently visible in chat
export function useChatScrollDetection() {
  const { syncToMessage, isScrollSyncing, chatScrollRef } = useScrollSync()
  const [visibleMessageId, setVisibleMessageId] = useState<string | null>(null)
  const scrollDetectionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastScrollTimeRef = useRef<number>(0)

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (isScrollSyncing) return // Don't sync during programmatic scrolling

      const now = Date.now()
      lastScrollTimeRef.current = now

      // Clear existing timer
      if (scrollDetectionTimerRef.current) {
        clearTimeout(scrollDetectionTimerRef.current)
      }

      // Debounce scroll detection to prevent excessive processing
      scrollDetectionTimerRef.current = setTimeout(() => {
        // Only process if this is still the most recent scroll event
        if (now !== lastScrollTimeRef.current) return

        const container = e.currentTarget
        const messageElements = container.querySelectorAll('[data-message-id]')

        if (messageElements.length === 0) return

        // Find the message closest to the center of the viewport
        const containerRect = container.getBoundingClientRect()
        const centerY = containerRect.top + containerRect.height / 2

        let closestElement: Element | null = null
        let closestDistance = Infinity

        messageElements.forEach(element => {
          const elementRect = element.getBoundingClientRect()

          // Only consider elements that are at least partially visible
          const isVisible =
            elementRect.bottom > containerRect.top &&
            elementRect.top < containerRect.bottom

          if (isVisible) {
            const elementCenterY = elementRect.top + elementRect.height / 2
            const distance = Math.abs(centerY - elementCenterY)

            if (distance < closestDistance) {
              closestDistance = distance
              closestElement = element
            }
          }
        })

        if (closestElement) {
          const messageId = closestElement.getAttribute('data-message-id')
          if (messageId && messageId !== visibleMessageId) {
            setVisibleMessageId(messageId)
            syncToMessage(messageId, 'chat')
          }
        }
      }, 150) // Debounce scroll detection by 150ms
    },
    [isScrollSyncing, syncToMessage, visibleMessageId]
  )

  return {
    visibleMessageId,
    handleScroll,
  }
}
