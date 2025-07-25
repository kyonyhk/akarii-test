'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Brain,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Doc } from '@/convex/_generated/dataModel'

type Analysis = Doc<'analyses'>

interface InlineAnalysisCardProps {
  analysis: Analysis
  isCompact?: boolean
  onVote?: (analysisId: string, vote: 'up' | 'down') => void
  className?: string
}

const STATEMENT_TYPE_COLORS = {
  question: 'bg-blue-100 text-blue-800 border-blue-200',
  opinion: 'bg-purple-100 text-purple-800 border-purple-200',
  fact: 'bg-green-100 text-green-800 border-green-200',
  request: 'bg-orange-100 text-orange-800 border-orange-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
} as const

const STATEMENT_TYPE_LABELS = {
  question: 'Question',
  opinion: 'Opinion',
  fact: 'Fact',
  request: 'Request',
  other: 'Other',
} as const

export function InlineAnalysisCard({
  analysis,
  isCompact = false,
  onVote,
  className,
}: InlineAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleVote = (vote: 'up' | 'down') => {
    onVote?.(analysis._id, vote)
  }

  const confidenceColor =
    analysis.confidenceLevel >= 80
      ? 'text-green-600'
      : analysis.confidenceLevel >= 60
        ? 'text-yellow-600'
        : 'text-red-600'

  if (isCompact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'inline-flex cursor-pointer items-center gap-1 rounded-md border bg-gray-50 px-2 py-1 text-xs transition-all duration-200',
                'hover:bg-gray-100 hover:shadow-sm',
                className
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={handleToggleExpanded}
            >
              <Brain className="h-3 w-3 text-gray-500" />
              <Badge
                variant="outline"
                className={cn(
                  'px-1 py-0 text-xs',
                  STATEMENT_TYPE_COLORS[analysis.statementType]
                )}
              >
                {STATEMENT_TYPE_LABELS[analysis.statementType]}
              </Badge>
              <span className={cn('font-medium', confidenceColor)}>
                {analysis.confidenceLevel}%
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2 text-sm">
              <div className="font-medium">Quick Analysis</div>
              {analysis.beliefs.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500">
                    Key Beliefs:
                  </div>
                  <div className="text-xs">
                    {analysis.beliefs.slice(0, 2).join(', ')}
                  </div>
                </div>
              )}
              {analysis.tradeOffs.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-500">
                    Trade-offs:
                  </div>
                  <div className="text-xs">
                    {analysis.tradeOffs.slice(0, 2).join(', ')}
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-500">Click to expand</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div
      className={cn(
        'mt-2 rounded-lg border bg-gray-50/50 transition-all duration-200',
        isExpanded ? 'bg-white shadow-sm' : 'hover:bg-gray-100/50',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between p-3"
        onClick={handleToggleExpanded}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <Brain className="h-4 w-4 text-gray-600" />
          <Badge
            variant="outline"
            className={cn(
              'text-sm',
              STATEMENT_TYPE_COLORS[analysis.statementType]
            )}
          >
            {STATEMENT_TYPE_LABELS[analysis.statementType]}
          </Badge>
          <span className="text-sm text-gray-600">Analysis</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', confidenceColor)}>
            {analysis.confidenceLevel}% confidence
          </span>
          {!isExpanded && <Eye className="h-3 w-3 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-3 border-t bg-white px-3 pb-3">
          {/* Beliefs */}
          {analysis.beliefs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">
                Key Beliefs
              </h4>
              <ul className="space-y-1">
                {analysis.beliefs.map((belief, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" />
                    {belief}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trade-offs */}
          {analysis.tradeOffs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">
                Trade-offs
              </h4>
              <ul className="space-y-1">
                {analysis.tradeOffs.map((tradeOff, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-orange-400" />
                    {tradeOff}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  handleVote('up')
                }}
                className="h-8 px-2 hover:bg-green-50 hover:text-green-600"
              >
                <ThumbsUp className="mr-1 h-3 w-3" />
                {analysis.thumbsUp}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  handleVote('down')
                }}
                className="h-8 px-2 hover:bg-red-50 hover:text-red-600"
              >
                <ThumbsDown className="mr-1 h-3 w-3" />
                {analysis.thumbsDown}
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              {analysis.rawData?.tokenUsage && (
                <span>{analysis.rawData.tokenUsage.totalTokens} tokens</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
