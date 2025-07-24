'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Analysis } from '@/types'
import { useScrollSync } from '@/contexts/scroll-sync-context'

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
  const isLowConfidence = analysis.confidenceLevel < 40
  const { syncToMessage, activeMessageId } = useScrollSync()

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

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        data-analysis-message-id={analysis.messageId}
        onClick={handleRowClick}
        className={cn(
          'cursor-pointer rounded-lg border bg-card p-3 transition-all hover:shadow-sm',
          isLowConfidence && 'opacity-40',
          isExpanded && 'shadow-sm ring-1 ring-primary/20',
          isCurrentlyActive && 'bg-accent/10 ring-2 ring-accent'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-start justify-between text-left">
            <div className="flex-1 space-y-2">
              {/* Header row with statement type and confidence */}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    statementTypeColors[analysis.statementType]
                  )}
                >
                  {analysis.statementType}
                </span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isLowConfidence
                      ? 'text-red-500 dark:text-red-400'
                      : analysis.confidenceLevel >= 70
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                  )}
                >
                  {analysis.confidenceLevel}% confidence
                </span>
              </div>

              {/* Summary row */}
              <div className="text-xs text-muted-foreground">
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
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3">
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
            {rawJSONElement || (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                View Raw JSON
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(analysis.createdAt)}
            </span>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
