'use client'

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { Doc } from '@/convex/_generated/dataModel'

type Analysis = Doc<'analyses'>

interface UseMessageAnalysesProps {
  messageIds: string[]
  enabled?: boolean
}

export function useMessageAnalyses({
  messageIds,
  enabled = true,
}: UseMessageAnalysesProps) {
  // Convert message IDs to the proper format
  const convexMessageIds = useMemo(
    () => messageIds.map(id => id as Id<'messages'>),
    [messageIds]
  )

  // Fetch analyses for all messages in bulk
  const analysisMap = useQuery(
    api.analyses.getAnalysesForMessages,
    enabled && messageIds.length > 0 ? { messageIds: convexMessageIds } : 'skip'
  )

  // Helper function to get analysis for a specific message
  const getAnalysisForMessage = (messageId: string): Analysis | null => {
    return analysisMap?.[messageId] || null
  }

  // Calculate loading state
  const isLoading =
    enabled && messageIds.length > 0 && analysisMap === undefined

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!analysisMap) return null

    const analyses = Object.values(analysisMap).filter(Boolean) as Analysis[]

    return {
      totalAnalyses: analyses.length,
      averageConfidence:
        analyses.length > 0
          ? analyses.reduce((sum, a) => sum + a.confidenceLevel, 0) /
            analyses.length
          : 0,
      statementTypes: analyses.reduce(
        (acc, analysis) => {
          acc[analysis.statementType] = (acc[analysis.statementType] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }, [analysisMap])

  return {
    analyses: analysisMap || {},
    getAnalysisForMessage,
    isLoading,
    analytics,
  }
}
