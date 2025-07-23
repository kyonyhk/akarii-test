'use client'

import { useState } from 'react'
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

interface PrismPanelProps {
  className?: string
  conversationId: string
}

export function PrismPanel({ className, conversationId }: PrismPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Mock data for development - will be replaced with real-time subscription
  const mockAnalyses = [
    {
      id: '1',
      messageId: 'msg-1',
      statementType: 'question' as const,
      beliefs: ['Users want better UX', 'Speed is critical'],
      tradeOffs: ['Performance vs Features', 'Complexity vs Simplicity'],
      confidenceLevel: 85,
      timestamp: Date.now(),
    },
    {
      id: '2',
      messageId: 'msg-2',
      statementType: 'opinion' as const,
      beliefs: ['AI should be transparent'],
      tradeOffs: ['Transparency vs Performance'],
      confidenceLevel: 25, // Low confidence example
      timestamp: Date.now() - 30000,
    },
  ]

  if (!isVisible) {
    return (
      <div className="fixed right-4 top-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">Show analysis panel</span>
        </Button>
      </div>
    )
  }

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 pb-2">
        <CardTitle className="text-sm font-medium">Analysis Prism</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            <span className="sr-only">
              {isCollapsed ? 'Expand' : 'Collapse'} panel
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            <EyeOff className="h-4 w-4" />
            <span className="sr-only">Hide panel</span>
          </Button>
        </div>
      </CardHeader>

      <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
        <CollapsibleContent className="flex-1">
          <CardContent className="flex h-full flex-col p-0">
            {mockAnalyses.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-4">
                <div className="text-center text-sm text-muted-foreground">
                  <Settings className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No analyses yet</p>
                  <p className="text-xs">Send a message to see analysis</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-4">
                  {mockAnalyses.map(analysis => (
                    <AnalysisPreview key={analysis.id} analysis={analysis} />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Latency indicator */}
            <div className="border-t p-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last analysis: 1.2s</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span>Live</span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

interface AnalysisPreviewProps {
  analysis: {
    id: string
    messageId: string
    statementType: 'question' | 'opinion' | 'fact' | 'request' | 'other'
    beliefs: string[]
    tradeOffs: string[]
    confidenceLevel: number
    timestamp: number
  }
}

function AnalysisPreview({ analysis }: AnalysisPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLowConfidence = analysis.confidenceLevel < 40

  const statementTypeColors = {
    question: 'text-blue-600 bg-blue-50 border-blue-200',
    opinion: 'text-purple-600 bg-purple-50 border-purple-200',
    fact: 'text-green-600 bg-green-50 border-green-200',
    request: 'text-orange-600 bg-orange-50 border-orange-200',
    other: 'text-gray-600 bg-gray-50 border-gray-200',
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          'rounded-lg border bg-card p-3 transition-all',
          isLowConfidence && 'opacity-50',
          isExpanded && 'ring-1 ring-primary/20'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-start justify-between text-left">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                    statementTypeColors[analysis.statementType]
                  )}
                >
                  {analysis.statementType}
                </span>
                <span className="text-xs text-muted-foreground">
                  {analysis.confidenceLevel}% confidence
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {analysis.beliefs.length} beliefs • {analysis.tradeOffs.length}{' '}
                trade-offs
              </div>
            </div>
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3">
          {analysis.beliefs.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-foreground">Beliefs</h4>
              <ul className="space-y-1">
                {analysis.beliefs.map((belief, index) => (
                  <li key={index} className="text-xs text-muted-foreground">
                    • {belief}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.tradeOffs.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-foreground">
                Trade-offs
              </h4>
              <ul className="space-y-1">
                {analysis.tradeOffs.map((tradeOff, index) => (
                  <li key={index} className="text-xs text-muted-foreground">
                    • {tradeOff}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={e => {
                e.stopPropagation()
                // TODO: Open raw JSON drawer
                console.log('Open raw JSON for:', analysis.id)
              }}
            >
              View Raw JSON
            </Button>
            <span className="text-xs text-muted-foreground">
              {new Date(analysis.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
