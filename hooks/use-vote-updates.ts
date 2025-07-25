'use client'

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

interface VoteData {
  analysisId: Id<'analyses'>
  thumbsUp: number
  thumbsDown: number
  userVotes: Array<{
    userId: string
    voteType: 'up' | 'down'
    timestamp: number
  }>
}

interface UseVoteUpdatesProps {
  analysisIds: Id<'analyses'>[]
  enabled?: boolean
}

export function useVoteUpdates({
  analysisIds,
  enabled = true,
}: UseVoteUpdatesProps) {
  // Fetch real-time vote data for all analysis IDs
  const voteData = useQuery(
    api.analyses.getVoteUpdates,
    enabled && analysisIds.length > 0 ? { analysisIds } : 'skip'
  )

  // Convert array to map for easier lookup
  const voteMap = useMemo(() => {
    if (!voteData) return {}

    return voteData.reduce(
      (acc, vote) => {
        if (vote) {
          acc[vote.analysisId] = vote
        }
        return acc
      },
      {} as Record<string, VoteData>
    )
  }, [voteData])

  // Helper function to get vote data for a specific analysis
  const getVoteData = (analysisId: Id<'analyses'>): VoteData | null => {
    return voteMap[analysisId] || null
  }

  // Helper function to get user's vote for a specific analysis
  const getUserVote = (
    analysisId: Id<'analyses'>,
    userId: string
  ): 'up' | 'down' | null => {
    const voteData = voteMap[analysisId]
    if (!voteData) return null

    const userVote = voteData.userVotes.find(vote => vote.userId === userId)
    return userVote?.voteType || null
  }

  // Calculate loading state
  const isLoading = enabled && analysisIds.length > 0 && voteData === undefined

  // Calculate vote statistics
  const voteStats = useMemo(() => {
    if (!voteData) return null

    const totalUpvotes = voteData.reduce((sum, vote) => sum + vote.thumbsUp, 0)
    const totalDownvotes = voteData.reduce(
      (sum, vote) => sum + vote.thumbsDown,
      0
    )
    const totalVotes = totalUpvotes + totalDownvotes

    return {
      totalVotes,
      totalUpvotes,
      totalDownvotes,
      positiveRatio: totalVotes > 0 ? totalUpvotes / totalVotes : 0,
    }
  }, [voteData])

  return {
    voteData: voteData || [],
    voteMap,
    getVoteData,
    getUserVote,
    isLoading,
    voteStats,
  }
}
