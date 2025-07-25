'use client'

import { useState, useRef, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThumbVoteButtonsProps {
  analysisId: string
  thumbsUp: number
  thumbsDown: number
  userVote: 'up' | 'down' | null
  onVote: (voteType: 'up' | 'down', requestId?: string) => Promise<any>
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
  const [optimisticState, setOptimisticState] = useState<{
    thumbsUp: number
    thumbsDown: number
    userVote: 'up' | 'down' | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeRequestRef = useRef<string | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isLoading || pendingVote) return

    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Generate unique request ID
    const requestId = `${analysisId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Prevent duplicate requests
    if (activeRequestRef.current) {
      return
    }
    activeRequestRef.current = requestId

    // Clear any previous errors
    setError(null)
    setPendingVote(voteType)

    // Calculate optimistic state
    const currentState = optimisticState || { thumbsUp, thumbsDown, userVote }
    let newOptimisticState = { ...currentState }

    // Remove previous vote if exists
    if (currentState.userVote === 'up') {
      newOptimisticState.thumbsUp--
    } else if (currentState.userVote === 'down') {
      newOptimisticState.thumbsDown--
    }

    // Add new vote if different from current
    if (currentState.userVote !== voteType) {
      if (voteType === 'up') {
        newOptimisticState.thumbsUp++
      } else {
        newOptimisticState.thumbsDown++
      }
      newOptimisticState.userVote = voteType
    } else {
      // Toggle off (same vote type)
      newOptimisticState.userVote = null
    }

    // Apply optimistic update
    setOptimisticState(newOptimisticState)

    // Debounce the actual request
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await onVote(voteType, requestId)

        // If server returned duplicate flag, keep optimistic state
        if (!result?.isDuplicate) {
          // Update with server response or keep optimistic state
          setOptimisticState(null) // Reset to use props values
        }
      } catch (error) {
        console.error('Error voting:', error)
        setError('Failed to save vote')

        // Rollback optimistic update
        setOptimisticState(null)
      } finally {
        setPendingVote(null)
        activeRequestRef.current = null
      }
    }, 300) // 300ms debounce
  }

  // Use optimistic state if available, otherwise use props
  const currentState = optimisticState || { thumbsUp, thumbsDown, userVote }

  const isUpActive = currentState.userVote === 'up'
  const isDownActive = currentState.userVote === 'down'
  const isUpPending = pendingVote === 'up'
  const isDownPending = pendingVote === 'down'

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      activeRequestRef.current = null
    }
  }, [])

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1">
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
          aria-label={`Thumbs up${currentState.thumbsUp > 0 ? ` (${currentState.thumbsUp})` : ''}`}
        >
          <ThumbsUp
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              isUpActive && 'scale-110',
              isUpPending && 'animate-pulse'
            )}
          />
          {currentState.thumbsUp > 0 && (
            <span className={cn('font-medium', isUpActive && 'font-semibold')}>
              {currentState.thumbsUp}
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
          aria-label={`Thumbs down${currentState.thumbsDown > 0 ? ` (${currentState.thumbsDown})` : ''}`}
        >
          <ThumbsDown
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              isDownActive && 'scale-110',
              isDownPending && 'animate-pulse'
            )}
          />
          {currentState.thumbsDown > 0 && (
            <span
              className={cn('font-medium', isDownActive && 'font-semibold')}
            >
              {currentState.thumbsDown}
            </span>
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-500 dark:text-red-400">{error}</div>
      )}
    </div>
  )
}
