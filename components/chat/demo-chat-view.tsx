'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/chat/message-bubble-redesigned'
import { ChatInput } from '@/components/chat/chat-input'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown } from 'lucide-react'
import { Message } from '@/types'
import type { Id } from '@/convex/_generated/dataModel'
import { format, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns'
import {
  processMessagesForGrouping,
  ProcessedMessage,
  MessageGroupingConfig,
  DEFAULT_GROUPING_CONFIG,
} from '@/lib/message-grouping'

interface DemoChatViewProps {
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

export function DemoChatView({
  className,
  showAnalysis = false, // Disable analysis for demo since it requires Convex
  analysisMode = 'none',
  groupingConfig = {},
}: DemoChatViewProps) {
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const userId = 'demo-user-1'
  const userName = 'Demo User'

  // Merge provided config with defaults and memoize it
  const config = useMemo(
    () => ({
      ...DEFAULT_GROUPING_CONFIG,
      ...groupingConfig,
    }),
    [groupingConfig]
  )

  // Generate demo messages with realistic conversation flow
  useEffect(() => {
    const baseTime = Date.now() - 2 * 24 * 60 * 60 * 1000 // 2 days ago

    const demoMessages: Message[] = [
      // Day 1 - Conversation start
      {
        _id: 'msg-1' as Id<'messages'>,
        content: 'Hey! How are you doing?',
        userId: 'user-alice',
        conversationId: 'demo-conversation',
        timestamp: baseTime,
      },
      {
        _id: 'msg-2' as Id<'messages'>,
        content: 'Pretty good! Just working on some new features.',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: baseTime + 30000, // 30 seconds later
      },
      {
        _id: 'msg-3' as Id<'messages'>,
        content: 'What kind of features?',
        userId: 'user-alice',
        conversationId: 'demo-conversation',
        timestamp: baseTime + 120000, // 2 minutes later
      },
      {
        _id: 'msg-4' as Id<'messages'>,
        content: 'Working on message grouping and smart timestamps',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: baseTime + 180000, // 3 minutes
      },
      {
        _id: 'msg-5' as Id<'messages'>,
        content:
          'It automatically groups consecutive messages from the same sender',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: baseTime + 185000, // 5 seconds later (should group)
      },
      {
        _id: 'msg-6' as Id<'messages'>,
        content: 'And only shows timestamps when enough time has passed',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: baseTime + 190000, // 5 seconds later (should group)
      },

      // After a longer break (6 minutes later)
      {
        _id: 'msg-7' as Id<'messages'>,
        content: 'That sounds really cool! 🚀',
        userId: 'user-alice',
        conversationId: 'demo-conversation',
        timestamp: baseTime + 550000, // 6 minutes later (new timestamp should show)
      },

      // Yesterday's messages
      {
        _id: 'msg-8' as Id<'messages'>,
        content: 'Good morning! How did the feature testing go?',
        userId: 'user-alice',
        conversationId: 'demo-conversation',
        timestamp: baseTime + 24 * 60 * 60 * 1000, // Next day
      },
      {
        _id: 'msg-9' as Id<'messages'>,
        content: 'Morning! It went really well.',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: baseTime + 24 * 60 * 60 * 1000 + 300000, // 5 minutes later
      },
      {
        _id: 'msg-10' as Id<'messages'>,
        content: 'The grouping logic works perfectly',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: baseTime + 24 * 60 * 60 * 1000 + 310000, // 10 seconds later
      },
      {
        _id: 'msg-11' as Id<'messages'>,
        content: 'And the timestamps appear at just the right intervals',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: baseTime + 24 * 60 * 60 * 1000 + 315000, // 5 seconds later
      },

      // Today's messages
      {
        _id: 'msg-12' as Id<'messages'>,
        content: 'Ready to ship this to production? 🎉',
        userId: 'user-alice',
        conversationId: 'demo-conversation',
        timestamp: Date.now() - 60000, // 1 minute ago
      },
      {
        _id: 'msg-13' as Id<'messages'>,
        content: 'Absolutely! The demo looks great.',
        userId: userId,
        conversationId: 'demo-conversation',
        timestamp: Date.now() - 30000, // 30 seconds ago
      },
    ]

    setMessages(demoMessages)
  }, [userId])

  // Process messages with grouping logic
  const processedMessages = useMemo(() => {
    return processMessagesForGrouping(messages, config)
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

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    const newMessage: Message = {
      _id: `msg-${Date.now()}` as Id<'messages'>,
      content: content.trim(),
      userId,
      conversationId: 'demo-conversation',
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, newMessage])
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

  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-background ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 p-4">
        <h2 className="text-lg font-semibold">
          Demo Chat with Message Grouping
        </h2>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-muted-foreground">Demo Mode</span>
        </div>
      </div>

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
                          : getUserDisplayName(message.userId)
                      }
                      timestamp={message.timestamp}
                      isOwn={message.userId === userId}
                      isActive={false}
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
          placeholder="Type your message to test grouping..."
        />
      </div>

      {/* Message count footer */}
      <div className="border-t bg-muted/30 px-4 py-2 text-center text-sm text-muted-foreground">
        {processedMessages.length} messages • Grouping:{' '}
        {config.groupingThreshold / 60000}min • Timestamps:{' '}
        {config.timestampThreshold / 60000}min
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

function getUserDisplayName(userId: string): string {
  const userNames: Record<string, string> = {
    'user-alice': 'Alice Johnson',
    'user-bob': 'Bob Smith',
    'user-charlie': 'Charlie Brown',
  }

  return userNames[userId] || `User ${userId.slice(-4)}`
}
