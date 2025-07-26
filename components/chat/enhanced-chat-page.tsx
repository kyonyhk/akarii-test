'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatContainer, ChatInput } from '@/components/chat'
import { MessageHistoryGrouped } from '@/components/chat/message-history-grouped'
import { useChat } from '@/hooks/use-chat'
import { Loader2 } from 'lucide-react'
import {
  useScrollSync,
  useChatScrollDetection,
} from '@/contexts/scroll-sync-context'

interface EnhancedChatPageProps {
  conversationId: string
  userId: string
  userName?: string
  showAnalysis?: boolean
  analysisMode?: 'inline' | 'compact' | 'none'
}

export function EnhancedChatPage({
  conversationId,
  userId,
  userName = 'Anonymous',
  showAnalysis = true,
  analysisMode = 'inline',
}: EnhancedChatPageProps) {
  const { messages, sendMessage, isLoading, isConnected } = useChat({
    conversationId,
    userId,
    userName,
  })

  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { registerChatScroll, activeMessageId, isScrollSyncing } =
    useScrollSync()
  const { handleScroll: handleSyncScroll } = useChatScrollDetection()

  // Register scroll container with sync context
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement
      if (viewport) {
        registerChatScroll(viewport)
      }
    }
  }, [registerChatScroll])

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content)
    } catch (error) {
      // Handle error (could show toast notification)
      console.error('Failed to send message:', error)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
    setIsScrolledUp(!isAtBottom)

    // Only handle sync scroll detection if not programmatically scrolling
    if (!isScrollSyncing) {
      handleSyncScroll(e)
    }
  }

  // Auto-scroll to bottom when new messages arrive (if not scrolled up)
  useEffect(() => {
    if (!isScrolledUp && messages.length > 0) {
      const scrollArea = document.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollArea) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: 'smooth',
        })
      }
    }
  }, [messages.length, isScrolledUp])

  if (!isConnected) {
    return (
      <ChatContainer
        title="Loading Chat..."
        conversationId={conversationId}
        showShareButton={true}
      >
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting to chat...</span>
          </div>
        </div>
      </ChatContainer>
    )
  }

  return (
    <ChatContainer
      title={`Chat (${messages.length} messages)`}
      conversationId={conversationId}
      showShareButton={true}
      className="relative"
    >
      {/* Enhanced Message History with Grouping */}
      <div className="min-h-0 flex-1">
        <MessageHistoryGrouped
          conversationId={conversationId}
          userId={userId}
          userName={userName}
          showAnalysis={showAnalysis}
          analysisMode={analysisMode}
          className="h-full"
        />
      </div>

      {/* Chat Input */}
      <div className="border-t bg-background p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder={isLoading ? 'Sending...' : 'Type your message...'}
        />
      </div>

      {/* Scroll to bottom button */}
      {isScrolledUp && (
        <div className="absolute bottom-20 right-4 z-10">
          <button
            onClick={() => {
              const scrollArea = document.querySelector(
                '[data-radix-scroll-area-viewport]'
              )
              if (scrollArea) {
                scrollArea.scrollTo({
                  top: scrollArea.scrollHeight,
                  behavior: 'smooth',
                })
                setIsScrolledUp(false)
              }
            }}
            className="rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:bg-primary/90"
            aria-label="Scroll to bottom"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        </div>
      )}
    </ChatContainer>
  )
}
