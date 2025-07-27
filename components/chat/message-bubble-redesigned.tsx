'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { InlineAnalysisCard } from '@/components/analysis/inline-analysis-card'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { Doc } from '@/convex/_generated/dataModel'
import { format, isToday, isYesterday } from 'date-fns'

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
  variant?: 'default' | 'compact' | 'grouped'
  showAvatar?: boolean
  showTimestamp?: boolean
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
  variant = 'default',
  showAvatar = true,
  showTimestamp = true,
}: MessageBubbleProps) {
  // Fetch analysis data for this message
  const analysis = useQuery(api.analyses.getAnalysisByMessage, {
    messageId: messageId as Id<'messages'>,
  })

  // Vote on analysis mutation
  const voteOnAnalysis = useMutation(api.analyses.voteOnAnalysis)

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)

    if (isToday(date)) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    if (isYesterday(date)) {
      return `Yesterday ${date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    }

    return format(date, 'MMM d, h:mm a')
  }

  const handleVote = async (analysisId: string, vote: 'up' | 'down') => {
    try {
      await voteOnAnalysis({
        analysisId: analysisId as Id<'analyses'>,
        vote,
        userId: authorId,
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

  // Compact variant for grouped messages
  if (variant === 'compact' || variant === 'grouped') {
    return (
      <div
        data-message-id={messageId}
        className={cn(
          'group flex gap-2 px-4 py-1 transition-all duration-200 hover:bg-muted/40',
          isOwn && 'flex-row-reverse',
          isActive && 'bg-accent/30 ring-1 ring-accent/50',
          className
        )}
      >
        {/* Avatar placeholder for alignment when not showing avatar */}
        <div className={cn('w-8 shrink-0', !showAvatar && 'opacity-0')}>
          {showAvatar && (
            <Avatar className="h-7 w-7">
              <AvatarImage src={authorAvatar} alt={displayName} />
              <AvatarFallback className="text-xs">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className={cn('flex max-w-[75%] flex-col', isOwn && 'items-end')}>
          <div
            className={cn(
              'group relative break-words rounded-2xl px-4 py-2 text-sm shadow-sm transition-all duration-200',
              'hover:shadow-md',
              isOwn
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-600/20'
                : 'border border-gray-200 bg-white text-gray-900 shadow-gray-200/50'
            )}
          >
            {content}

            {/* Timestamp on hover */}
            {showTimestamp && (
              <div
                className={cn(
                  'absolute -bottom-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
                  'text-xs text-muted-foreground',
                  isOwn ? 'right-0' : 'left-0'
                )}
              >
                {formatTime(timestamp)}
              </div>
            )}
          </div>

          {/* Analysis for compact variant */}
          {showAnalysis && analysis && analysisMode !== 'none' && (
            <div
              className={cn(
                'mt-2 w-full max-w-md',
                isOwn && 'flex justify-end'
              )}
            >
              <InlineAnalysisCard
                analysis={analysis}
                isCompact={true}
                onVote={handleVote}
                className="shadow-sm"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default variant with full layout
  return (
    <div
      data-message-id={messageId}
      className={cn(
        'group flex gap-3 px-4 py-3 transition-all duration-200',
        'hover:bg-muted/30',
        isOwn && 'flex-row-reverse',
        isActive && 'bg-accent/40 ring-2 ring-accent/60',
        className
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <Avatar className="h-9 w-9 shadow-sm ring-2 ring-white">
          <AvatarImage src={authorAvatar} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div
        className={cn(
          'flex min-w-0 max-w-[70%] flex-col space-y-2',
          isOwn && 'items-end'
        )}
      >
        {/* Header with name and timestamp */}
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            isOwn && 'flex-row-reverse'
          )}
        >
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {displayName}
          </span>
          {showTimestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTime(timestamp)}
            </span>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'group relative break-words rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-200',
            'hover:scale-[1.02] hover:shadow-md',
            isOwn
              ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-blue-600/30'
              : 'border border-gray-200 bg-white text-gray-900 shadow-gray-200/60 hover:border-gray-300',
            'dark:shadow-lg',
            isOwn
              ? 'dark:from-blue-500 dark:via-blue-600 dark:to-blue-700 dark:shadow-blue-500/20'
              : 'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:shadow-gray-900/40'
          )}
        >
          {content}

          {/* Message tail/pointer */}
          <div
            className={cn(
              'absolute top-3 h-3 w-3 rotate-45 shadow-sm',
              isOwn
                ? '-right-1.5 bg-gradient-to-br from-blue-600 to-blue-700'
                : '-left-1.5 border-l border-t border-gray-200 bg-white',
              'dark:shadow-md',
              isOwn
                ? 'dark:from-blue-500 dark:to-blue-600'
                : 'dark:border-gray-700 dark:bg-gray-800'
            )}
          />
        </div>

        {/* Analysis section */}
        {showAnalysis && analysis && analysisMode !== 'none' && (
          <div className={cn('w-full max-w-md', isOwn && 'flex justify-end')}>
            <InlineAnalysisCard
              analysis={analysis}
              isCompact={analysisMode === 'compact'}
              onVote={handleVote}
              className={cn(
                'border-0 bg-gray-50/80 shadow-sm backdrop-blur-sm',
                'dark:bg-gray-800/60',
                isOwn && 'ml-auto'
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}
