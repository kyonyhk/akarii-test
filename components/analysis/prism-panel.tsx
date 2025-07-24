'use client'

import { useState } from 'react'
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
import { RawJSONDrawer } from './raw-json-drawer'

interface PrismPanelProps {
  className?: string
  conversationId: string
}

export function PrismPanel({ className, conversationId }: PrismPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Mock data for development - will be replaced with real-time subscription
  const mockAnalyses: Analysis[] = [
    {
      _id: '1' as any,
      messageId: 'msg-1' as any,
      statementType: 'question' as const,
      beliefs: ['Users want better UX', 'Speed is critical'],
      tradeOffs: ['Performance vs Features', 'Complexity vs Simplicity'],
      confidenceLevel: 85,
      rawData: {
        originalMessage:
          'How can we improve the user experience while maintaining performance?',
        analysisTimestamp: Date.now(),
        modelUsed: 'gpt-4o-mini',
        processingTimeMs: 1200,
        cached: false,
        openaiResponse: {
          id: 'chatcmpl-ABC123',
          object: 'chat.completion',
          created: 1699999999,
          model: 'gpt-4o-mini',
          usage: {
            prompt_tokens: 150,
            completion_tokens: 75,
            total_tokens: 225,
          },
        },
      },
      thumbsUp: 2,
      thumbsDown: 0,
      userVotes: { 'user-1': 'up', 'user-2': 'up' },
      createdAt: Date.now(),
    },
    {
      _id: '2' as any,
      messageId: 'msg-2' as any,
      statementType: 'opinion' as const,
      beliefs: ['AI should be transparent'],
      tradeOffs: ['Transparency vs Performance'],
      confidenceLevel: 25, // Low confidence example
      rawData: {
        originalMessage:
          'I think AI systems should show their reasoning process.',
        analysisTimestamp: Date.now() - 30000,
        modelUsed: 'gpt-4o-mini',
        processingTimeMs: 950,
        cached: true,
        reasoning:
          'Low confidence due to ambiguous phrasing and lack of context',
        openaiResponse: {
          id: 'chatcmpl-DEF456',
          object: 'chat.completion',
          created: 1699999969,
          model: 'gpt-4o-mini',
          usage: {
            prompt_tokens: 120,
            completion_tokens: 45,
            total_tokens: 165,
          },
        },
      },
      thumbsUp: 0,
      thumbsDown: 1,
      userVotes: { 'user-3': 'down' },
      createdAt: Date.now() - 30000,
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
                    <AnalysisRow
                      key={analysis._id}
                      analysis={analysis}
                      onViewRawJSON={analysis => (
                        <RawJSONDrawer analysis={analysis}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
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
