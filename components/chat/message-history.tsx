'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from '@/components/chat/message-bubble'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, ChevronDown } from 'lucide-react'
import { Message } from '@/types'
import { format, isToday, isYesterday, startOfDay, isSameDay } from 'date-fns'
import { VariableSizeList as List } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'

interface MessageHistoryProps {
  conversationId: string
  userId: string
  userName?: string
  className?: string
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
const DATE_SEPARATOR_HEIGHT = 40

export function MessageHistory({
  conversationId,
  userId,
  userName = 'Anonymous',
  className,
}: MessageHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)

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
          height: ITEM_HEIGHT,
        })
      })
    })

    return items
  }, [messageGroups])

  const totalHeight = virtualItems.reduce((sum, item) => sum + item.height, 0)

  // Load initial messages
  useEffect(() => {
    loadMessages()
  }, [conversationId])

  const loadMessages = async (cursor?: string) => {
    try {
      setIsLoading(!cursor)
      setLoadingMore(!!cursor)

      // In a real implementation, you would use Convex query:
      // const result = await api.messages.getMessagesWithUsers({
      //   conversationId,
      //   cursor,
      //   limit: 50
      // })

      // Mock data with realistic conversation flow
      const mockMessages: Message[] = Array.from({ length: 50 }, (_, i) => {
        const messageTime = new Date(Date.now() - i * 300000) // 5 minutes apart
        const authorId = i % 4 === 0 ? userId : `user-${i % 4}`
        return {
          _id: `msg-${cursor || 'initial'}-${i}`,
          content: generateRealisticMessage(i, authorId === userId),
          userId: authorId,
          conversationId,
          timestamp: messageTime.toISOString(),
          _creationTime: messageTime.getTime(),
          user: {
            _id: authorId,
            name: authorId === userId ? userName : `Colleague ${(i % 4) + 1}`,
            email: `user${i % 4}@company.com`,
            clerkId: `clerk-${i % 4}`,
          },
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
      setIsScrolledUp(false)
    }
  }

  const getItemSize = (index: number) => {
    return virtualItems[index]?.height || ITEM_HEIGHT
  }

  const isItemLoaded = (index: number) => {
    return !!virtualItems[index]
  }

  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    if (!hasMore || loadingMore) return

    const nextCursor = `page-${Math.floor(messages.length / 50) + 1}`
    await loadMessages(nextCursor)
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
    return (
      <div style={style}>
        <MessageBubble
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
          isActive={false} // TODO: Implement active message tracking
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
        <div className="flex items-center justify-center border-b p-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading older messages...</span>
          </div>
        </div>
      )}

      <div className="flex-1">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No messages in this conversation yet.</p>
            </div>
          </div>
        ) : (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={hasMore ? virtualItems.length + 1 : virtualItems.length}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                height={400} // Fixed height for the virtual list
                itemCount={
                  hasMore ? virtualItems.length + 1 : virtualItems.length
                }
                itemSize={getItemSize}
                onItemsRendered={onItemsRendered}
                className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                itemData={{
                  groups: messageGroups,
                  userId,
                  userName,
                }}
              >
                {VirtualItem}
              </List>
            )}
          </InfiniteLoader>
        )}
      </div>

      {/* Scroll to bottom button */}
      {isScrolledUp && (
        <div className="absolute bottom-4 right-4">
          <Button
            onClick={scrollToBottom}
            size="sm"
            className="rounded-full shadow-lg"
            variant="default"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message count footer */}
      <div className="border-t p-2 text-center text-sm text-muted-foreground">
        {messages.length} messages
        {hasMore && <span className="ml-2">• Scroll up to load more</span>}
      </div>
    </div>
  )
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-2 flex items-center gap-4 py-2">
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

function generateRealisticMessage(index: number, isOwn: boolean): string {
  const ownMessages = [
    'I think we should prioritize the user authentication feature first.',
    'Let me review the requirements and get back to you.',
    "That makes sense. I'll start working on the API endpoints.",
    'Just pushed the latest changes. Can you take a look?',
    "I'm running into an issue with the database connection.",
    'The tests are passing now. Ready for review.',
    "Good point about the error handling. I'll add that.",
    'Meeting at 2 PM works for me.',
    "I've updated the documentation with the new endpoints.",
    'Should we consider using a different approach here?',
  ]

  const otherMessages = [
    "Sounds good! I'll help with the frontend integration.",
    'The mockups look great. When can we start implementation?',
    "I've reviewed the code. Just a few minor suggestions.",
    'Can we schedule a quick call to discuss the architecture?',
    'The performance improvements are looking good so far.',
    'I think we might need to reconsider the data model.',
    'Great work on the bug fixes! Everything is working now.',
    "Let's make sure we have proper error messages for users.",
    'The deployment went smoothly. No issues reported.',
    "I'll handle the testing for this feature.",
  ]

  const messages = isOwn ? ownMessages : otherMessages
  return messages[index % messages.length]
}
