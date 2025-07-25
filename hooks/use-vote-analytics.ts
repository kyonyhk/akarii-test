'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

interface UseVoteAnalyticsProps {
  conversationId?: string
  timeRange?: number // Hours to look back
  enabled?: boolean
}

export function useVoteAnalytics({
  conversationId,
  timeRange,
  enabled = true,
}: UseVoteAnalyticsProps = {}) {
  // Get most popular analyses
  const mostPopular = useQuery(
    api.analyses.getMostPopularAnalyses,
    enabled
      ? {
          limit: 10,
          conversationId,
        }
      : 'skip'
  )

  // Get least popular analyses
  const leastPopular = useQuery(
    api.analyses.getLeastPopularAnalyses,
    enabled
      ? {
          limit: 5,
          conversationId,
          minVotes: 3,
        }
      : 'skip'
  )

  // Get overall vote aggregation statistics
  const aggregationStats = useQuery(
    api.analyses.getVoteAggregationStats,
    enabled
      ? {
          conversationId,
          timeRange,
        }
      : 'skip'
  )

  // Calculate loading states
  const isLoading =
    enabled &&
    (mostPopular === undefined ||
      leastPopular === undefined ||
      aggregationStats === undefined)

  return {
    // Data
    mostPopular: mostPopular || [],
    leastPopular: leastPopular || [],
    aggregationStats,

    // Loading state
    isLoading,

    // Convenience getters
    get totalVotes() {
      return aggregationStats?.votes?.totalVotes || 0
    },
    get overallScore() {
      return aggregationStats?.votes?.overallVoteScore || 0
    },
    get engagementRate() {
      return aggregationStats?.engagement?.engagementRate || 0
    },
    get insights() {
      return aggregationStats?.insights
    },
  }
}

interface UseUserVotingPatternsProps {
  userId: string
  timeRange?: number // Hours to look back
  enabled?: boolean
}

export function useUserVotingPatterns({
  userId,
  timeRange,
  enabled = true,
}: UseUserVotingPatternsProps) {
  const userPatterns = useQuery(
    api.analyses.getUserVotingPatterns,
    enabled && userId
      ? {
          userId,
          timeRange,
        }
      : 'skip'
  )

  const isLoading = enabled && userId && userPatterns === undefined

  return {
    // Data
    patterns: userPatterns,
    isLoading,

    // Convenience getters
    get totalVotes() {
      return userPatterns?.totalVotes || 0
    },
    get positiveRatio() {
      return userPatterns?.positiveVoteRatio || 0
    },
    get recentActivity() {
      return userPatterns?.recentVotes || 0
    },
    get votingActivity() {
      return userPatterns?.votingActivity || []
    },
    get isActive() {
      return userPatterns?.statistics?.engagement === 'active'
    },
  }
}

interface UseAnalysisVoteStatsProps {
  analysisId: Id<'analyses'>
  enabled?: boolean
}

export function useAnalysisVoteStats({
  analysisId,
  enabled = true,
}: UseAnalysisVoteStatsProps) {
  const voteStats = useQuery(
    api.analyses.getAnalysisVoteStats,
    enabled && analysisId ? { analysisId } : 'skip'
  )

  const isLoading = enabled && analysisId && voteStats === undefined

  return {
    // Data
    stats: voteStats,
    isLoading,

    // Convenience getters
    get voteScore() {
      return voteStats?.voteScore || 0
    },
    get totalVotes() {
      return voteStats?.totalVotes || 0
    },
    get engagement() {
      return voteStats?.engagement || 0
    },
    get positiveRatio() {
      return voteStats?.positiveRatio || 0
    },
    get negativeRatio() {
      return voteStats?.negativeRatio || 0
    },
  }
}

// Utility hook for sorting and filtering analyses
export function useSortedAnalyses(
  analyses: any[],
  sortBy: 'score' | 'engagement' | 'recent' | 'controversial' = 'score'
) {
  // This would normally use the sortAnalysesByScore function
  // but since it's a Convex function, we'll implement client-side sorting here
  const sorted = analyses
    ? [...analyses].sort((a, b) => {
        switch (sortBy) {
          case 'score':
            const scoreA =
              a.thumbsUp + a.thumbsDown > 0
                ? a.thumbsUp / (a.thumbsUp + a.thumbsDown)
                : 0
            const scoreB =
              b.thumbsUp + b.thumbsDown > 0
                ? b.thumbsUp / (b.thumbsUp + b.thumbsDown)
                : 0
            if (scoreB !== scoreA) return scoreB - scoreA
            return b.thumbsUp + b.thumbsDown - (a.thumbsUp + a.thumbsDown)

          case 'engagement':
            const engagementA =
              (a.thumbsUp + a.thumbsDown) * 0.4 +
              (a.userVotes?.length || 0) * 0.6
            const engagementB =
              (b.thumbsUp + b.thumbsDown) * 0.4 +
              (b.userVotes?.length || 0) * 0.6
            return engagementB - engagementA

          case 'recent':
            return (b.createdAt || 0) - (a.createdAt || 0)

          case 'controversial':
            const totalA = a.thumbsUp + a.thumbsDown
            const totalB = b.thumbsUp + b.thumbsDown
            if (totalA === 0 && totalB === 0) return 0
            if (totalA === 0) return 1
            if (totalB === 0) return -1

            const controversyA = Math.abs(0.5 - a.thumbsUp / totalA)
            const controversyB = Math.abs(0.5 - b.thumbsUp / totalB)
            if (controversyA !== controversyB)
              return controversyA - controversyB
            return totalB - totalA

          default:
            return 0
        }
      })
    : []

  return sorted
}
