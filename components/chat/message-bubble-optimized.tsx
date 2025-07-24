'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { InlineAnalysisCard } from '@/components/analysis/inline-analysis-card'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { Doc } from '@/convex/_generated/dataModel'

type Analysis = Doc<'analyses'>

interface MessageBubbleOptimizedProps {
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
  analysis?: Analysis | null // Pre-fetched analysis data
}

export function MessageBubbleOptimized({
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
  analysis = null,
}: MessageBubbleOptimizedProps) {
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

        {/* Inline Analysis Card */}
        {showAnalysis && analysis && analysisMode !== 'none' && (
          <div className={cn('w-full', isOwn ? 'ml-4' : 'mr-4')}>
            <InlineAnalysisCard
              analysis={analysis}
              isCompact={analysisMode === 'compact'}
              onVote={handleVote}
              className={cn(isOwn && 'ml-auto max-w-[calc(100%-1rem)]')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
