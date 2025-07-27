'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/chat/message-bubble-redesigned'
import { ChatInput } from '@/components/chat/chat-input'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, ChevronDown } from 'lucide-react'
import { Message } from '@/types'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { format, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns'
import {
  processMessagesForGrouping,
  ProcessedMessage,
  MessageGroupingConfig,
  DEFAULT_GROUPING_CONFIG,
} from '@/lib/message-grouping'

interface IntegratedChatViewProps {
  conversationId: string
  userId: string
  userName?: string
  className?: string
  showAnalysis?: boolean
  analysisMode?: 'inline' | 'compact' | 'none'
  groupingConfig?: Partial<MessageGroupingConfig>
}

interface MessageGroup {
  date: Date
  label: string
  messages: ProcessedMessage[]
}

export function IntegratedChatView({
  conversationId,
  userId,
  userName = 'Anonymous',
  className,
  showAnalysis = true,
  analysisMode = 'inline',
  groupingConfig = {},
}: IntegratedChatViewProps) {
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Merge provided config with defaults and memoize it
  const config = useMemo(
    () => ({
      ...DEFAULT_GROUPING_CONFIG,
      ...groupingConfig,
    }),
    [groupingConfig]
  )

  // Fetch messages using Convex
  const messagesQuery = useQuery(api.messages.getMessagesWithUsers, {
    conversationId,
    limit: 100,
  })

  const messages = useMemo(() => messagesQuery || [], [messagesQuery])

  // Send message mutation
  const sendMessage = useMutation(api.messages.sendMessage)

  // Process messages with grouping logic
  const processedMessages = useMemo(() => {
    // Convert Convex messages to our Message type
    const typedMessages: Message[] = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      userId: msg.userId,
      conversationId: msg.conversationId,
      timestamp: msg.timestamp,
      analysisId: msg.analysisId,
    }))

    return processMessagesForGrouping(typedMessages, config)
  }, [messages, config])

  // Group processed messages by date
  const messageGroups = useMemo(() => {
    const groups: MessageGroup[] = []
    let currentGroup: MessageGroup | null = null

    processedMessages.forEach(message => {
      const messageDate = new Date(message.timestamp)
      const dayStart = startOfDay(messageDate)

      if (!currentGroup || !isSameDay(currentGroup.date, dayStart)) {
        const label = formatDateLabel(dayStart)
        currentGroup = {
          date: dayStart,
          label,
          messages: [],
        }
        groups.push(currentGroup)
      }

      currentGroup.messages.push(message)
    })

    return groups
  }, [processedMessages])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      await sendMessage({
        content: newMessage.trim(),
        userId,
        conversationId,
        username: userName,
      })
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
    setIsScrolledUp(!isAtBottom)
  }

  const scrollToBottom = () => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    )
    if (scrollArea) {
      scrollArea.scrollTo({
        top: scrollArea.scrollHeight,
        behavior: 'smooth',
      })
      setIsScrolledUp(false)
    }
  }

  // Auto-scroll to bottom when new messages arrive (if not scrolled up)
  useEffect(() => {
    if (!isScrolledUp && messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100)
    }
  }, [messages.length, isScrolledUp])

  if (!messages) {
    return (
      <div className={`flex flex-1 items-center justify-center ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading messages...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Messages Area */}
      <div className="relative min-h-0 flex-1">
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full"
          onScrollCapture={handleScroll}
        >
          <div className="space-y-2 p-4">
            {messageGroups.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No messages in this conversation yet.</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              </div>
            ) : (
              messageGroups.map((group, groupIndex) => (
                <div key={group.label} className="space-y-2">
                  {/* Date separator */}
                  <DateSeparator label={group.label} />

                  {/* Messages in this date group */}
                  {group.messages.map((message, messageIndex) => (
                    <MessageBubble
                      key={message._id}
                      messageId={message._id}
                      content={message.content}
                      authorId={message.userId}
                      authorName={
                        message.userId === userId
                          ? userName
                          : `User ${message.userId.slice(-4)}`
                      }
                      timestamp={message.timestamp}
                      isOwn={message.userId === userId}
                      isActive={false} // TODO: Implement active message tracking
                      showAnalysis={showAnalysis}
                      analysisMode={analysisMode}
                      variant={message.variant}
                      showAvatar={message.showAvatar}
                      showTimestamp={message.showTimestamp}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {isScrolledUp && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              onClick={scrollToBottom}
              size="sm"
              className="rounded-full shadow-lg transition-transform hover:scale-105"
              variant="default"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Chat Input Area */}
      <div className="border-t bg-background p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={false}
          placeholder="Type your message..."
        />
      </div>

      {/* Message count footer */}
      <div className="border-t bg-muted/30 px-4 py-2 text-center text-sm text-muted-foreground">
        {processedMessages.length} messages
      </div>
    </div>
  )
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-4 py-2">
      <div className="flex-1 border-t border-border" />
      <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }
  if (isYesterday(date)) {
    return 'Yesterday'
  }

  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 7) {
    return format(date, 'EEEE') // Day name (e.g., "Monday")
  }

  if (date.getFullYear() === now.getFullYear()) {
    return format(date, 'MMM d') // Month and day (e.g., "Jan 15")
  }

  return format(date, 'MMM d, yyyy') // Full date (e.g., "Jan 15, 2023")
}
