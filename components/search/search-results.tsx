'use client'

import { useState } from 'react'
import {
  MessageCircle,
  User,
  Calendar,
  Star,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface SearchResult {
  message: {
    _id: string
    content: string
    timestamp: number
    conversationId: string
    user?: {
      name: string
      email: string
      avatar?: string
      role?: string
    }
  }
  analysis?: {
    statementType: string
    beliefs: string[]
    tradeOffs: string[]
    confidenceLevel: number
    thumbsUp: number
    thumbsDown: number
  }
  matchType?: string
}

interface SearchResultsProps {
  results: SearchResult[]
  searchTerms?: {
    andTerms: string[]
    orTerms: string[]
    notTerms: string[]
  }
  isLoading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

// Function to highlight search terms in text
function highlightText(
  text: string,
  terms: string[] = [],
  className: string = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded'
): JSX.Element {
  if (!terms.length) return <span>{text}</span>

  let highlightedText = text
  const regex = new RegExp(
    `(${terms
      .map(
        term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      )
      .join('|')})`,
    'gi'
  )

  const parts = highlightedText.split(regex)

  return (
    <span>
      {parts.map((part, index) => {
        const isMatch = terms.some(
          term => part.toLowerCase() === term.toLowerCase()
        )
        return isMatch ? (
          <mark key={index} className={className}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      })}
    </span>
  )
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatementTypeColor(type: string): string {
  switch (type) {
    case 'question':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'opinion':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'fact':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'request':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

export function SearchResults({
  results,
  searchTerms,
  isLoading = false,
  onLoadMore,
  hasMore = false,
}: SearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  const toggleExpanded = (messageId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="mb-1 h-4 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-32 rounded bg-gray-200" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-3/4 rounded bg-gray-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-medium">No results found</h3>
        <p className="text-sm">Try adjusting your search terms or filters</p>
      </div>
    )
  }

  const allTerms = [
    ...(searchTerms?.andTerms || []),
    ...(searchTerms?.orTerms || []),
  ]

  return (
    <div className="space-y-4">
      {results.map(result => {
        const isExpanded = expandedResults.has(result.message._id)
        const { message, analysis } = result

        return (
          <Card key={message._id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.user?.avatar} />
                    <AvatarFallback>
                      {message.user?.name?.charAt(0) || (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {message.user?.name || 'Unknown User'}
                      </span>
                      {message.user?.role && (
                        <Badge variant="outline" className="text-xs">
                          {message.user.role}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(message.timestamp)}
                    </div>
                  </div>
                </div>
                {analysis && (
                  <div className="flex items-center gap-2">
                    <Badge
                      className={getStatementTypeColor(analysis.statementType)}
                    >
                      {analysis.statementType}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" />
                      {analysis.confidenceLevel}%
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Message Content */}
                <div className="text-sm leading-relaxed">
                  {highlightText(message.content, allTerms)}
                </div>

                {/* Analysis Details */}
                {analysis && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Analysis</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ThumbsUp className="h-3 w-3" />
                            {analysis.thumbsUp}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ThumbsDown className="h-3 w-3" />
                            {analysis.thumbsDown}
                          </div>
                        </div>
                      </div>

                      {/* Beliefs */}
                      {analysis.beliefs.length > 0 && (
                        <div>
                          <h5 className="mb-1 text-xs font-medium text-muted-foreground">
                            Beliefs:
                          </h5>
                          <div className="space-y-1 text-xs">
                            {analysis.beliefs
                              .slice(0, isExpanded ? undefined : 2)
                              .map((belief, idx) => (
                                <div
                                  key={idx}
                                  className="text-muted-foreground"
                                >
                                  •{' '}
                                  {highlightText(
                                    belief,
                                    allTerms,
                                    'bg-blue-200 dark:bg-blue-800 px-1 rounded'
                                  )}
                                </div>
                              ))}
                            {!isExpanded && analysis.beliefs.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                                onClick={() => toggleExpanded(message._id)}
                              >
                                +{analysis.beliefs.length - 2} more beliefs
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Trade-offs */}
                      {analysis.tradeOffs.length > 0 && (
                        <div>
                          <h5 className="mb-1 text-xs font-medium text-muted-foreground">
                            Trade-offs:
                          </h5>
                          <div className="space-y-1 text-xs">
                            {analysis.tradeOffs
                              .slice(0, isExpanded ? undefined : 2)
                              .map((tradeOff, idx) => (
                                <div
                                  key={idx}
                                  className="text-muted-foreground"
                                >
                                  •{' '}
                                  {highlightText(
                                    tradeOff,
                                    allTerms,
                                    'bg-orange-200 dark:bg-orange-800 px-1 rounded'
                                  )}
                                </div>
                              ))}
                            {!isExpanded && analysis.tradeOffs.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-orange-600 hover:text-orange-700"
                                onClick={() => toggleExpanded(message._id)}
                              >
                                +{analysis.tradeOffs.length - 2} more trade-offs
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {isExpanded &&
                        (analysis.beliefs.length > 2 ||
                          analysis.tradeOffs.length > 2) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => toggleExpanded(message._id)}
                          >
                            Show less
                          </Button>
                        )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Load More Button */}
      {hasMore && (
        <div className="py-4 text-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
            Load More Results
          </Button>
        </div>
      )}
    </div>
  )
}
