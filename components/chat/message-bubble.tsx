'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  messageId: string
  content: string
  authorId: string
  authorName?: string
  authorAvatar?: string
  timestamp: number
  isOwn?: boolean
  className?: string
  isActive?: boolean
}

export function MessageBubble({
  messageId,
  content,
  authorId,
  authorName,
  authorAvatar,
  timestamp,
  isOwn = false,
  className,
  isActive = false,
}: MessageBubbleProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = authorName || `User ${authorId.slice(-4)}`

  return (
    <div
      data-message-id={messageId}
      className={cn(
        'group flex gap-3 p-3 transition-colors hover:bg-muted/30',
        isOwn && 'flex-row-reverse',
        isActive && 'bg-accent/50 ring-2 ring-accent',
        className
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={authorAvatar} alt={displayName} />
        <AvatarFallback className="text-xs">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'flex max-w-[70%] flex-col space-y-1',
          isOwn && 'items-end'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 text-sm text-muted-foreground',
            isOwn && 'flex-row-reverse'
          )}
        >
          <span className="font-medium">{displayName}</span>
          <span className="text-xs">{formatTime(timestamp)}</span>
        </div>

        <div
          className={cn(
            'break-words rounded-lg px-3 py-2 text-sm',
            isOwn ? 'ml-4 bg-primary text-primary-foreground' : 'mr-4 bg-muted'
          )}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
