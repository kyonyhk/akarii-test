'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubbleOptimized } from '@/components/chat/message-bubble-optimized'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, ChevronDown } from 'lucide-react'
import { Message } from '@/types'
import type { Id } from '@/convex/_generated/dataModel'
import { format, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns'
import { VariableSizeList as List } from 'react-window'
// InfiniteLoader removed for simplicity - can be added back if needed
import { useMessageAnalyses } from '@/hooks/use-message-analyses'

interface MessageHistoryOptimizedProps {
  conversationId: string
  userId: string
  userName?: string
  className?: string
  showAnalysis?: boolean
  analysisMode?: 'inline' | 'compact' | 'none'
}

interface MessageGroup {
  date: Date
  label: string
  messages: Message[]
}

interface VirtualItemData {
  groups: MessageGroup[]
  userId: string
  userName: string
  activeMessageId?: string
}

const ITEM_HEIGHT = 80 // Approximate height per message
const ITEM_HEIGHT_WITH_ANALYSIS = 140 // Height per message with analysis card
const DATE_SEPARATOR_HEIGHT = 40

export function MessageHistoryOptimized({
  conversationId,
  userId,
  userName = 'Anonymous',
  className,
  showAnalysis = true,
  analysisMode = 'inline',
}: MessageHistoryOptimizedProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)

  // Extract message IDs for bulk analysis fetching
  const messageIds = useMemo(() => messages.map(m => m._id), [messages])

  // Bulk fetch analyses for all messages
  const {
    analyses,
    getAnalysisForMessage,
    isLoading: analysesLoading,
  } = useMessageAnalyses({
    messageIds,
    enabled: showAnalysis && analysisMode !== 'none',
  })

  // Group messages by date
  const messageGroups = useMemo(() => {
    const groups: MessageGroup[] = []
    let currentGroup: MessageGroup | null = null

    messages.forEach(message => {
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
  }, [messages])

  // Calculate virtual list items (groups + messages)
  const virtualItems = useMemo(() => {
    const items: Array<{
      type: 'date' | 'message'
      data: any
      height: number
    }> = []

    messageGroups.forEach(group => {
      // Add date separator
      items.push({
        type: 'date',
        data: group,
        height: DATE_SEPARATOR_HEIGHT,
      })

      // Add messages
      group.messages.forEach(message => {
        items.push({
          type: 'message',
          data: message,
          height:
            showAnalysis && analysisMode !== 'none'
              ? ITEM_HEIGHT_WITH_ANALYSIS
              : ITEM_HEIGHT,
        })
      })
    })

    return items
  }, [messageGroups, showAnalysis, analysisMode])

  const totalHeight = virtualItems.reduce((sum, item) => sum + item.height, 0)

  // Load initial messages
  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  const loadMessages = async (cursor?: string) => {
    if (!cursor) {
      setIsLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Generate mock messages for now
      const mockMessages: Message[] = Array.from({ length: 50 }, (_, i) => {
        const index = cursor ? messages.length + i : i
        return {
          _id: `msg-${index}` as Id<'messages'>,
          conversationId,
          content: `This is message ${index + 1}. It contains some sample content that might be analyzed for insights and understanding.`,
          userId:
            Math.random() > 0.5
              ? userId
              : `user-${Math.floor(Math.random() * 5)}`,
          timestamp: Date.now() - (50 - i) * 1000 * 60 * 5, // 5 minutes apart
          // user field not in schema
        }
      })

      if (cursor) {
        setMessages(prev => [...mockMessages, ...prev])
      } else {
        setMessages(mockMessages)
      }

      setHasMore(mockMessages.length === 50)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setIsLoading(false)
      setLoadingMore(false)
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
    const isAtTop = scrollTop <= 10

    setIsScrolledUp(!isAtBottom)

    // Load more messages when scrolled to top
    if (isAtTop && hasMore && !loadingMore) {
      loadMessages(`page-${Math.floor(messages.length / 50) + 1}`)
    }
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
    }
  }

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) {
      return 'Today'
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return format(date, 'EEEE, MMMM d')
    }
  }

  const DateSeparator = ({ label }: { label: string }) => (
    <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <Calendar className="h-3 w-3" />
        <span>{label}</span>
      </div>
    </div>
  )

  const getItemHeight = (index: number) => {
    return virtualItems[index]?.height || ITEM_HEIGHT
  }

  const VirtualItem = ({
    index,
    style,
  }: {
    index: number
    style: React.CSSProperties
  }) => {
    const item = virtualItems[index]

    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )
    }

    if (item.type === 'date') {
      const group = item.data as MessageGroup
      return (
        <div style={style}>
          <DateSeparator label={group.label} />
        </div>
      )
    }

    const message = item.data as Message
    const analysis = getAnalysisForMessage(message._id)

    return (
      <div style={style}>
        <MessageBubbleOptimized
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
          analysis={analysis}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`flex flex-1 items-center justify-center ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading message history...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Loading indicator for pagination */}
      {loadingMore && (
        <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading older messages...
        </div>
      )}

      {/* Analysis loading indicator */}
      {showAnalysis && analysesLoading && (
        <div className="flex items-center justify-center py-1 text-xs text-muted-foreground">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Loading analyses...
        </div>
      )}

      {/* Virtual scrolling message list */}
      <div className="flex-1 overflow-hidden">
        <List
          ref={listRef}
          height={400} // Fixed height for virtual scrolling
          itemCount={virtualItems.length}
          itemSize={getItemHeight}
          width="100%"
          className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        >
          {VirtualItem}
        </List>
      </div>

      {/* Scroll to bottom button */}
      {isScrolledUp && (
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-4 right-4 rounded-full shadow-lg"
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
