'use client'

import { ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ShareButton } from './share-button'

interface ChatContainerProps {
  children: ReactNode
  className?: string
  title?: string
  conversationId?: string
  showShareButton?: boolean
}

export function ChatContainer({
  children,
  className,
  title = 'Chat',
  conversationId,
  showShareButton = false,
}: ChatContainerProps) {
  const { isSignedIn } = useAuth()
  return (
    <Card
      className={cn(
        'flex h-full max-h-[600px] flex-col overflow-hidden',
        className
      )}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {showShareButton && conversationId && isSignedIn && (
            <ShareButton conversationId={conversationId} />
          )}
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-muted-foreground">Online</span>
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </Card>
  )
}
