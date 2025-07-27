'use client'

import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  conversationId: string
  className?: string
}

export function TypingIndicator({
  conversationId,
  className,
}: TypingIndicatorProps) {
  const { typingUsers } = useTypingIndicator({ conversationId })

  // Get user details for typing users
  const users = useQuery(api.users.list)

  if (!typingUsers.length) return null

  // Map typing user IDs to user names
  const typingUserNames = typingUsers
    .map(typingUser => {
      const user = users?.find(u => u.clerkId === typingUser.userId)
      return user?.name || 'Someone'
    })
    .filter(Boolean)

  if (!typingUserNames.length) return null

  const getTypingText = () => {
    if (typingUserNames.length === 1) {
      return `${typingUserNames[0]} is typing...`
    } else if (typingUserNames.length === 2) {
      return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`
    } else {
      return `${typingUserNames[0]} and ${typingUserNames.length - 1} others are typing...`
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground',
        className
      )}
    >
      <div className="flex gap-1">
        <div className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <div className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <div className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" />
      </div>
      <span>{getTypingText()}</span>
    </div>
  )
}
