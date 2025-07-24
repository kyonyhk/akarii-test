'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatContainer, ChatInput, MessageBubble } from '@/components/chat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@/hooks/use-chat'
import { Loader2 } from 'lucide-react'
import {
  useScrollSync,
  useChatScrollDetection,
} from '@/contexts/scroll-sync-context'

interface ChatPageProps {
  conversationId: string
  userId: string
  userName?: string
}

export function ChatPage({
  conversationId,
  userId,
  userName = 'Anonymous',
}: ChatPageProps) {
  const { messages, sendMessage, isLoading, isConnected } = useChat({
    conversationId,
    userId,
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
      <ChatContainer title="Loading Chat...">
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
    <ChatContainer title={`Chat (${messages.length} messages)`}>
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 p-2"
        onScrollCapture={handleScroll}
      >
        <div className="space-y-1">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(message => (
              <MessageBubble
                key={message._id}
                messageId={message._id}
                content={message.content}
                authorId={message.userId}
                authorName={
                  message.userId === userId
                    ? userName
                    : message.user?.name || `User ${message.userId.slice(-4)}`
                }
                timestamp={message.timestamp}
                isOwn={message.userId === userId}
                isActive={activeMessageId === message._id}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder={isLoading ? 'Sending...' : 'Type your message...'}
      />

      {/* Scroll to bottom button */}
      {isScrolledUp && (
        <div className="absolute bottom-16 right-4">
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
            className="rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            ↓
          </button>
        </div>
      )}
    </ChatContainer>
  )
}
