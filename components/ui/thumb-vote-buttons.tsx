'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThumbVoteButtonsProps {
  analysisId: string
  thumbsUp: number
  thumbsDown: number
  userVote: 'up' | 'down' | null
  onVote: (voteType: 'up' | 'down') => Promise<void>
  isLoading?: boolean
  size?: 'sm' | 'default'
  className?: string
}

export function ThumbVoteButtons({
  analysisId,
  thumbsUp,
  thumbsDown,
  userVote,
  onVote,
  isLoading = false,
  size = 'sm',
  className,
}: ThumbVoteButtonsProps) {
  const [pendingVote, setPendingVote] = useState<'up' | 'down' | null>(null)

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isLoading || pendingVote) return

    setPendingVote(voteType)
    try {
      await onVote(voteType)
    } finally {
      setPendingVote(null)
    }
  }

  const isUpActive = userVote === 'up'
  const isDownActive = userVote === 'down'
  const isUpPending = pendingVote === 'up'
  const isDownPending = pendingVote === 'down'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Thumbs Up Button */}
      <Button
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'default'}
        className={cn(
          'h-7 gap-1.5 px-2 text-xs transition-all',
          isUpActive
            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950/50 dark:text-green-400 dark:hover:bg-green-900/50'
            : 'text-muted-foreground hover:text-foreground',
          (isUpPending || (isLoading && !isDownPending)) && 'opacity-50',
          'hover:scale-105 active:scale-95'
        )}
        onClick={() => handleVote('up')}
        disabled={isLoading || !!pendingVote}
        aria-label={`Thumbs up${thumbsUp > 0 ? ` (${thumbsUp})` : ''}`}
      >
        <ThumbsUp
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            isUpActive && 'scale-110',
            isUpPending && 'animate-pulse'
          )}
        />
        {thumbsUp > 0 && (
          <span className={cn('font-medium', isUpActive && 'font-semibold')}>
            {thumbsUp}
          </span>
        )}
      </Button>

      {/* Thumbs Down Button */}
      <Button
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'default'}
        className={cn(
          'h-7 gap-1.5 px-2 text-xs transition-all',
          isDownActive
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-900/50'
            : 'text-muted-foreground hover:text-foreground',
          (isDownPending || (isLoading && !isUpPending)) && 'opacity-50',
          'hover:scale-105 active:scale-95'
        )}
        onClick={() => handleVote('down')}
        disabled={isLoading || !!pendingVote}
        aria-label={`Thumbs down${thumbsDown > 0 ? ` (${thumbsDown})` : ''}`}
      >
        <ThumbsDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            isDownActive && 'scale-110',
            isDownPending && 'animate-pulse'
          )}
        />
        {thumbsDown > 0 && (
          <span className={cn('font-medium', isDownActive && 'font-semibold')}>
            {thumbsDown}
          </span>
        )}
      </Button>
    </div>
  )
}
