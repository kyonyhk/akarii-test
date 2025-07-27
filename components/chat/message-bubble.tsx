'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { InlineAnalysisCard } from '@/components/analysis/inline-analysis-card'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { Doc } from '@/convex/_generated/dataModel'
import ReactMarkdown from 'react-markdown'

type Analysis = Doc<'analyses'>

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
  showAnalysis?: boolean
  analysisMode?: 'inline' | 'compact' | 'none'
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
  showAnalysis = true,
  analysisMode = 'inline',
}: MessageBubbleProps) {
  // Fetch analysis data for this message
  const analysis = useQuery(api.analyses.getAnalysisByMessage, {
    messageId: messageId as Id<'messages'>,
  })

  // Vote on analysis mutation
  const voteOnAnalysis = useMutation(api.analyses.voteOnAnalysis)

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleVote = async (analysisId: string, vote: 'up' | 'down') => {
    try {
      await voteOnAnalysis({
        analysisId: analysisId as Id<'analyses'>,
        vote,
        userId: authorId, // Using the current user's ID for voting
      })
    } catch (error) {
      console.error('Error voting on analysis:', error)
    }
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
        'group flex gap-4 rounded-2xl p-6 transition-all duration-150 ease-out hover:bg-muted/20',
        isOwn && 'flex-row-reverse',
        isActive && 'bg-accent/20 ring-2 ring-primary/20',
        className
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={authorAvatar} alt={displayName} />
        <AvatarFallback className="text-sm font-medium">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'flex max-w-[70%] flex-col space-y-2',
          isOwn && 'items-end'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 text-sm text-muted-foreground',
            isOwn && 'flex-row-reverse'
          )}
        >
          <span className="font-medium text-foreground">{displayName}</span>
          <span className="text-xs">{formatTime(timestamp)}</span>
        </div>

        <div
          className={cn(
            'break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
            'transition-all duration-150 ease-out',
            'active:scale-[0.99]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
            isOwn
              ? 'ml-6 bg-primary text-primary-foreground'
              : 'mr-6 border border-border bg-card hover:bg-gray-50 dark:hover:bg-gray-800/50'
          )}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => <span>{children}</span>,
              strong: ({ children }) => (
                <strong className="font-bold">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Inline Analysis Card */}
        {showAnalysis && analysis && analysisMode !== 'none' && (
          <div className={cn('w-full', isOwn ? 'ml-6' : 'mr-6')}>
            <InlineAnalysisCard
              analysis={analysis}
              isCompact={analysisMode === 'compact'}
              onVote={handleVote}
              className={cn(isOwn && 'ml-auto max-w-[calc(100%-1.5rem)]')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
