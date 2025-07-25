'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Analysis } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, ChevronDown, Settings, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnalysisRow } from './analysis-row'
import { useScrollSync } from '@/contexts/scroll-sync-context'
import { RawJSONDrawer } from './raw-json-drawer'
import { useVoteUpdates } from '@/hooks/use-vote-updates'
import type { Id } from '@/convex/_generated/dataModel'

interface PrismPanelProps {
  className?: string
  conversationId: string
}

export function PrismPanel({ className, conversationId }: PrismPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [lastAnalysisTime, setLastAnalysisTime] = useState(1200)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { registerAnalysisScroll, activeMessageId } = useScrollSync()

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Register scroll container with sync context
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement
      if (viewport) {
        registerAnalysisScroll(viewport)
      }
    }
  }, [registerAnalysisScroll])

  // Fetch real analyses data for the conversation
  const rawAnalyses = useQuery(api.analyses.getAnalysesForConversation, {
    conversationId: conversationId as Id<'conversations'>,
  })

  // Extract analysis IDs for real-time vote updates
  const analysisIds = useMemo(() => {
    return rawAnalyses?.map(analysis => analysis._id) || []
  }, [rawAnalyses])

  // Subscribe to real-time vote updates
  const { voteMap, isLoading: voteLoading } = useVoteUpdates({
    analysisIds,
    enabled: analysisIds.length > 0,
  })

  // Merge analyses with real-time vote data
  const analyses = useMemo(() => {
    if (!rawAnalyses) return []

    return rawAnalyses.map(analysis => {
      const voteData = voteMap[analysis._id]
      if (voteData) {
        // Update vote counts with real-time data
        return {
          ...analysis,
          thumbsUp: voteData.thumbsUp,
          thumbsDown: voteData.thumbsDown,
          userVotes: voteData.userVotes,
        }
      }
      return analysis
    })
  }, [rawAnalyses, voteMap])

  if (!isVisible) {
    return (
      <div
        className={cn(
          'fixed z-50 transition-all duration-200',
          isMobile ? 'bottom-4 right-4' : 'right-4 top-4'
        )}
      >
        <Button
          variant="outline"
          size={isMobile ? 'default' : 'sm'}
          onClick={() => setIsVisible(true)}
          className={cn(
            'bg-background/80 shadow-lg backdrop-blur-sm',
            isMobile && 'h-12 w-12 rounded-full p-0'
          )}
        >
          <Eye className={cn(isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
          <span className="sr-only">Show analysis panel</span>
        </Button>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'flex h-full min-h-0 flex-col transition-all duration-200',
        isMobile && 'rounded-b-none rounded-t-lg',
        className
      )}
    >
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-between space-y-0 pb-2',
          isMobile ? 'px-4 py-3' : 'px-3 py-2'
        )}
      >
        <CardTitle
          className={cn('font-medium', isMobile ? 'text-base' : 'text-sm')}
        >
          Analysis Prism
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn('p-0', isMobile ? 'h-8 w-8' : 'h-6 w-6')}
          >
            {isCollapsed ? (
              <ChevronRight className={cn(isMobile ? 'h-4 w-4' : 'h-3 w-3')} />
            ) : (
              <ChevronDown className={cn(isMobile ? 'h-4 w-4' : 'h-3 w-3')} />
            )}
            <span className="sr-only">
              {isCollapsed ? 'Expand' : 'Collapse'} panel
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className={cn('p-0', isMobile ? 'h-8 w-8' : 'h-6 w-6')}
          >
            <EyeOff className={cn(isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
            <span className="sr-only">Hide panel</span>
          </Button>
        </div>
      </CardHeader>

      <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
        <CollapsibleContent className="min-h-0 flex-1">
          <CardContent className="flex h-full min-h-0 flex-col p-0">
            {rawAnalyses === undefined ? (
              <div className="flex flex-1 items-center justify-center p-4">
                <div className="text-center text-sm text-muted-foreground">
                  <Settings className="mx-auto mb-2 h-8 w-8 animate-pulse opacity-50" />
                  <p>Loading analyses...</p>
                </div>
              </div>
            ) : analyses.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-4">
                <div className="text-center text-sm text-muted-foreground">
                  <Settings className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No analyses yet</p>
                  <p className="text-xs">Send a message to see analysis</p>
                </div>
              </div>
            ) : (
              <ScrollArea
                ref={scrollAreaRef}
                className="flex-1 overflow-hidden"
              >
                <div
                  className={cn('min-h-0 space-y-2', isMobile ? 'p-3' : 'p-4')}
                >
                  {analyses.map(analysis => (
                    <AnalysisRow
                      key={analysis._id}
                      analysis={analysis}
                      isActive={activeMessageId === analysis.messageId}
                      onViewRawJSON={analysis => (
                        <RawJSONDrawer analysis={analysis}>
                          <Button
                            variant="ghost"
                            size={isMobile ? 'default' : 'sm'}
                            className={cn(
                              'text-muted-foreground hover:text-foreground',
                              isMobile ? 'h-8 px-3 text-sm' : 'h-7 px-2 text-xs'
                            )}
                          >
                            View Raw JSON
                          </Button>
                        </RawJSONDrawer>
                      )}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Enhanced latency indicator */}
            <div
              className={cn(
                'border-t transition-all duration-200',
                isMobile ? 'p-3' : 'p-2'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-between text-muted-foreground',
                  isMobile ? 'text-sm' : 'text-xs'
                )}
              >
                <div className="flex items-center gap-2">
                  <span>
                    Last analysis: {(lastAnalysisTime / 1000).toFixed(1)}s
                  </span>
                  {lastAnalysisTime > 2000 && (
                    <span className="text-xs text-yellow-500">Slow</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      'rounded-full transition-colors duration-200',
                      lastAnalysisTime <= 2000
                        ? 'bg-green-500'
                        : lastAnalysisTime <= 5000
                          ? 'bg-yellow-500'
                          : 'bg-red-500',
                      isMobile ? 'h-2 w-2' : 'h-1.5 w-1.5'
                    )}
                  />
                  <span
                    className={cn(
                      'font-medium',
                      lastAnalysisTime <= 2000
                        ? 'text-green-600 dark:text-green-400'
                        : lastAnalysisTime <= 5000
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {lastAnalysisTime <= 2000
                      ? 'Fast'
                      : lastAnalysisTime <= 5000
                        ? 'OK'
                        : 'Slow'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
