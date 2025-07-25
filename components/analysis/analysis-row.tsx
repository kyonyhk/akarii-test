'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ThumbVoteButtons } from '@/components/ui/thumb-vote-buttons'
import { ChevronRight, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Analysis } from '@/types'
import { useScrollSync } from '@/contexts/scroll-sync-context'
import { useUser } from '@/hooks/useUser'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  useConfidenceThresholds,
  getConfidenceTreatment,
  getConfidenceColor,
  shouldShowAnalysis,
} from '@/hooks/useConfidenceThresholds'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AnalysisRowProps {
  analysis: Analysis
  onViewRawJSON?: (analysis: Analysis) => React.ReactNode
  isActive?: boolean
}

export function AnalysisRow({
  analysis,
  onViewRawJSON,
  isActive = false,
}: AnalysisRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const thresholds = useConfidenceThresholds()
  const confidenceTreatment = getConfidenceTreatment(
    analysis.confidenceLevel,
    thresholds
  )
  const confidenceColor = getConfidenceColor(
    analysis.confidenceLevel,
    thresholds
  )
  const shouldShow = shouldShowAnalysis(analysis.confidenceLevel, thresholds)
  const { syncToMessage, activeMessageId } = useScrollSync()
  const { clerkUser } = useUser()
  const thumbVote = useMutation(api.analyses.thumbVote)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Don't render if confidence is below hide threshold
  if (!shouldShow) {
    return null
  }

  // Determine if this analysis is currently active
  const isCurrentlyActive = isActive || activeMessageId === analysis.messageId

  const statementTypeColors = {
    question:
      'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-800',
    opinion:
      'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/50 dark:border-purple-800',
    fact: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/50 dark:border-green-800',
    request:
      'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/50 dark:border-orange-800',
    other:
      'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950/50 dark:border-gray-800',
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const rawJSONElement = onViewRawJSON?.(analysis)

  const handleRowClick = () => {
    // Sync to the corresponding message when analysis row is clicked
    syncToMessage(analysis.messageId, 'analysis')
  }

  const handleVote = async (voteType: 'up' | 'down', requestId?: string) => {
    if (!clerkUser?.id) return

    setIsVoting(true)
    try {
      const result = await thumbVote({
        analysisId: analysis._id,
        userId: clerkUser.id,
        voteType,
        requestId,
      })
      return result
    } catch (error) {
      console.error('Error voting:', error)
      throw error
    } finally {
      setIsVoting(false)
    }
  }

  // Get current user's vote
  const currentUserVote =
    analysis.userVotes.find(vote => vote.userId === clerkUser?.id)?.voteType ||
    null

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        data-analysis-message-id={analysis.messageId}
        onClick={handleRowClick}
        className={cn(
          'cursor-pointer touch-manipulation rounded-lg border bg-card transition-all hover:shadow-sm',
          confidenceTreatment === 'grey_out' && 'opacity-40',
          confidenceTreatment === 'warning' &&
            'ring-1 ring-yellow-200 dark:ring-yellow-800',
          isExpanded && 'shadow-sm ring-1 ring-primary/20',
          isCurrentlyActive && 'bg-accent/10 ring-2 ring-accent',
          isMobile ? 'p-4 active:scale-[0.98]' : 'p-3'
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full touch-manipulation items-start justify-between text-left',
              isMobile && 'min-h-[44px]'
            )}
          >
            <div className={cn('flex-1', isMobile ? 'space-y-3' : 'space-y-2')}>
              {/* Header row with statement type and confidence */}
              <div
                className={cn(
                  'flex items-center',
                  isMobile ? 'gap-3' : 'gap-2'
                )}
              >
                <span
                  className={cn(
                    'inline-flex rounded-full border font-medium',
                    statementTypeColors[analysis.statementType],
                    isMobile ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
                  )}
                >
                  {analysis.statementType}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-medium',
                          confidenceColor.textColor,
                          isMobile ? 'text-sm' : 'text-xs'
                        )}
                      >
                        {confidenceTreatment === 'warning' && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {confidenceTreatment === 'grey_out' && (
                          <Info className="h-3 w-3" />
                        )}
                        {analysis.confidenceLevel}% confidence
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{confidenceColor.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Thresholds: Hide &lt;{thresholds.hideThreshold}%, Grey
                        &lt;{thresholds.displayThreshold}%, Warning &lt;
                        {thresholds.warningThreshold}%
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Summary row */}
              <div
                className={cn(
                  'text-muted-foreground',
                  isMobile ? 'text-sm' : 'text-xs'
                )}
              >
                <span className="font-medium">{analysis.beliefs.length}</span>{' '}
                beliefs
                {analysis.beliefs.length > 0 &&
                  analysis.tradeOffs.length > 0 &&
                  ' • '}
                {analysis.tradeOffs.length > 0 && (
                  <>
                    <span className="font-medium">
                      {analysis.tradeOffs.length}
                    </span>{' '}
                    trade-offs
                  </>
                )}
              </div>
            </div>

            <ChevronRight
              className={cn(
                'shrink-0 text-muted-foreground transition-transform',
                isExpanded && 'rotate-90',
                isMobile ? 'h-5 w-5' : 'h-4 w-4'
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent
          className={cn(
            'space-y-3 overflow-hidden',
            isMobile ? 'mt-4' : 'mt-3'
          )}
        >
          {/* Beliefs section */}
          {analysis.beliefs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Beliefs</h4>
              <ul className="space-y-1.5">
                {analysis.beliefs.map((belief, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span className="leading-relaxed">{belief}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trade-offs section */}
          {analysis.tradeOffs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">
                Trade-offs
              </h4>
              <ul className="space-y-1.5">
                {analysis.tradeOffs.map((tradeOff, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span className="leading-relaxed">{tradeOff}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer with actions and timestamp */}
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-3">
              {rawJSONElement || (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  View Raw JSON
                </Button>
              )}
              <ThumbVoteButtons
                analysisId={analysis._id}
                thumbsUp={analysis.thumbsUp}
                thumbsDown={analysis.thumbsDown}
                userVote={currentUserVote}
                onVote={handleVote}
                isLoading={isVoting}
                size="sm"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(analysis.createdAt)}
            </span>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
