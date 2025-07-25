import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentTimestamp } from './utils'

// Create a new analysis for a message
export const createAnalysis = mutation({
  args: {
    messageId: v.id('messages'),
    statementType: v.union(
      v.literal('question'),
      v.literal('opinion'),
      v.literal('fact'),
      v.literal('request'),
      v.literal('other')
    ),
    beliefs: v.array(v.string()),
    tradeOffs: v.array(v.string()),
    confidenceLevel: v.number(),
    rawData: v.any(),
  },
  handler: async (ctx, args) => {
    // Validate that the message exists
    const message = await ctx.db.get(args.messageId)
    if (!message) {
      throw new Error('Message not found')
    }

    // Validate confidence level
    if (args.confidenceLevel < 0 || args.confidenceLevel > 100) {
      throw new Error('Confidence level must be between 0 and 100')
    }

    // Create the analysis
    const analysisId = await ctx.db.insert('analyses', {
      messageId: args.messageId,
      statementType: args.statementType,
      beliefs: args.beliefs,
      tradeOffs: args.tradeOffs,
      confidenceLevel: args.confidenceLevel,
      rawData: args.rawData,
      thumbsUp: 0,
      thumbsDown: 0,
      userVotes: [],
      createdAt: getCurrentTimestamp(),
    })

    // Update the message to link to this analysis
    await ctx.db.patch(args.messageId, {
      analysisId: analysisId,
    })

    return analysisId
  },
})

// Get analysis by message ID (optimized with index)
export const getAnalysisByMessage = query({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    // Use indexed query instead of full table scan
    const analysis = await ctx.db
      .query('analyses')
      .withIndex('by_message', q => q.eq('messageId', args.messageId))
      .first()

    return analysis || null
  },
})

// Get analysis by ID
export const getAnalysis = query({
  args: {
    analysisId: v.id('analyses'),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId)

    if (!analysis) {
      throw new Error('Analysis not found')
    }

    return analysis
  },
})

// Vote on an analysis (thumbs up/down)
export const voteOnAnalysis = mutation({
  args: {
    analysisId: v.id('analyses'),
    userId: v.string(),
    vote: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId)

    if (!analysis) {
      throw new Error('Analysis not found')
    }

    // Get current user vote from array structure
    const currentVoteIndex = analysis.userVotes.findIndex(
      vote => vote.userId === args.userId
    )
    const currentVote =
      currentVoteIndex >= 0
        ? analysis.userVotes[currentVoteIndex].voteType
        : null

    // Calculate new vote counts
    let newThumbsUp = analysis.thumbsUp
    let newThumbsDown = analysis.thumbsDown
    const newUserVotes = [...analysis.userVotes]

    // Remove previous vote if exists
    if (currentVote === 'up') {
      newThumbsUp--
    } else if (currentVote === 'down') {
      newThumbsDown--
    }
    if (currentVoteIndex >= 0) {
      newUserVotes.splice(currentVoteIndex, 1)
    }

    // Add new vote if different from current
    if (currentVote !== args.vote) {
      if (args.vote === 'up') {
        newThumbsUp++
      } else {
        newThumbsDown++
      }
      newUserVotes.push({
        userId: args.userId,
        voteType: args.vote,
        timestamp: getCurrentTimestamp(),
      })
    }

    // Update the analysis
    await ctx.db.patch(args.analysisId, {
      thumbsUp: newThumbsUp,
      thumbsDown: newThumbsDown,
      userVotes: newUserVotes,
    })

    return args.analysisId
  },
})

// Update analysis data
export const updateAnalysis = mutation({
  args: {
    analysisId: v.id('analyses'),
    statementType: v.optional(
      v.union(
        v.literal('question'),
        v.literal('opinion'),
        v.literal('fact'),
        v.literal('request'),
        v.literal('other')
      )
    ),
    beliefs: v.optional(v.array(v.string())),
    tradeOffs: v.optional(v.array(v.string())),
    confidenceLevel: v.optional(v.number()),
    rawData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId)

    if (!analysis) {
      throw new Error('Analysis not found')
    }

    // Validate confidence level if provided
    if (
      args.confidenceLevel !== undefined &&
      (args.confidenceLevel < 0 || args.confidenceLevel > 100)
    ) {
      throw new Error('Confidence level must be between 0 and 100')
    }

    // Prepare update object with only provided fields
    const updates: any = {}
    if (args.statementType !== undefined)
      updates.statementType = args.statementType
    if (args.beliefs !== undefined) updates.beliefs = args.beliefs
    if (args.tradeOffs !== undefined) updates.tradeOffs = args.tradeOffs
    if (args.confidenceLevel !== undefined)
      updates.confidenceLevel = args.confidenceLevel
    if (args.rawData !== undefined) updates.rawData = args.rawData

    // Update the analysis
    await ctx.db.patch(args.analysisId, updates)

    return args.analysisId
  },
})

// Thumb vote mutation with proper schema compliance and duplicate prevention
export const thumbVote = mutation({
  args: {
    analysisId: v.id('analyses'),
    userId: v.string(),
    voteType: v.union(v.literal('up'), v.literal('down')),
    requestId: v.optional(v.string()), // For request deduplication
  },
  handler: async (ctx, args) => {
    // Validate that the analysis exists
    const analysis = await ctx.db.get(args.analysisId)
    if (!analysis) {
      throw new Error('Analysis not found')
    }

    // Validate userId
    if (!args.userId || args.userId.trim() === '') {
      throw new Error('User ID is required')
    }

    // Simple duplicate request prevention using request ID and timestamp
    if (args.requestId) {
      const recentRequestThreshold = Date.now() - 1000 // 1 second window
      const currentUserVotes = analysis.userVotes as Array<{
        userId: string
        voteType: 'up' | 'down'
        timestamp: number
      }>

      // Check if there's a very recent vote from this user (within 1 second)
      const recentVote = currentUserVotes.find(
        vote =>
          vote.userId === args.userId && vote.timestamp > recentRequestThreshold
      )

      if (recentVote && recentVote.voteType === args.voteType) {
        // Return current state without changes for duplicate requests
        return {
          analysisId: args.analysisId,
          thumbsUp: analysis.thumbsUp,
          thumbsDown: analysis.thumbsDown,
          userVote: recentVote.voteType,
          isDuplicate: true,
        }
      }
    }

    // Get current user votes (properly typed as array per schema)
    const currentUserVotes = analysis.userVotes as Array<{
      userId: string
      voteType: 'up' | 'down'
      timestamp: number
    }>

    // Find existing vote by this user
    const existingVoteIndex = currentUserVotes.findIndex(
      vote => vote.userId === args.userId
    )

    const existingVote =
      existingVoteIndex >= 0 ? currentUserVotes[existingVoteIndex] : null

    // Calculate new vote counts
    let newThumbsUp = analysis.thumbsUp
    let newThumbsDown = analysis.thumbsDown
    const newUserVotes = [...currentUserVotes]

    // Remove previous vote if exists
    if (existingVote) {
      if (existingVote.voteType === 'up') {
        newThumbsUp--
      } else if (existingVote.voteType === 'down') {
        newThumbsDown--
      }
      // Remove the old vote
      newUserVotes.splice(existingVoteIndex, 1)
    }

    // Add new vote if different from existing or if no existing vote
    if (!existingVote || existingVote.voteType !== args.voteType) {
      if (args.voteType === 'up') {
        newThumbsUp++
      } else {
        newThumbsDown++
      }
      // Add the new vote with timestamp
      newUserVotes.push({
        userId: args.userId,
        voteType: args.voteType,
        timestamp: getCurrentTimestamp(),
      })
    }
    // If same vote type, it's already removed above (toggle off)

    // Atomic update of the analysis
    await ctx.db.patch(args.analysisId, {
      thumbsUp: newThumbsUp,
      thumbsDown: newThumbsDown,
      userVotes: newUserVotes,
    })

    return {
      analysisId: args.analysisId,
      thumbsUp: newThumbsUp,
      thumbsDown: newThumbsDown,
      userVote:
        existingVote && existingVote.voteType === args.voteType
          ? null
          : args.voteType,
      isDuplicate: false,
    }
  },
})

// Delete an analysis
export const deleteAnalysis = mutation({
  args: {
    analysisId: v.id('analyses'),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId)

    if (!analysis) {
      throw new Error('Analysis not found')
    }

    // Remove analysis reference from the message
    await ctx.db.patch(analysis.messageId, {
      analysisId: undefined,
    })

    // Delete the analysis
    await ctx.db.delete(args.analysisId)

    return args.analysisId
  },
})

// Get analyses for a conversation (optimized with indexed queries)
export const getAnalysesForConversation = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    // Use indexed query to get messages for the conversation
    const conversationMessages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .filter(q => q.neq(q.field('analysisId'), undefined))
      .collect()

    // Get analyses for these messages using Promise.all for parallel fetching
    const analysisPromises = conversationMessages
      .slice(0, limit)
      .map(async message => {
        if (message.analysisId) {
          return await ctx.db.get(message.analysisId)
        }
        return null
      })

    const analyses = await Promise.all(analysisPromises)

    // Filter out null results and sort by creation time (most recent first)
    return analyses
      .filter(
        (analysis): analysis is NonNullable<typeof analysis> =>
          analysis !== null
      )
      .sort((a, b) => b.createdAt - a.createdAt)
  },
})

// Get analysis statistics (optimized with indexed queries)
// Get analyses for multiple messages (bulk fetch for optimization)
export const getAnalysesForMessages = query({
  args: {
    messageIds: v.array(v.id('messages')),
  },
  handler: async (ctx, args) => {
    // Fetch all analyses in parallel for better performance
    const analysisPromises = args.messageIds.map(async messageId => {
      const analysis = await ctx.db
        .query('analyses')
        .withIndex('by_message', q => q.eq('messageId', messageId))
        .first()
      return { messageId, analysis }
    })

    const results = await Promise.all(analysisPromises)

    // Return as a map for easy lookup
    const analysisMap: Record<string, any> = {}
    results.forEach(({ messageId, analysis }) => {
      if (analysis) {
        analysisMap[messageId] = analysis
      }
    })

    return analysisMap
  },
})

export const getAnalysisStats = query({
  args: {
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let analyses: any[] = []

    if (args.conversationId) {
      // Use indexed query for conversation messages
      const conversationMessages = await ctx.db
        .query('messages')
        .withIndex('by_conversation', q =>
          q.eq('conversationId', args.conversationId!)
        )
        .filter(q => q.neq(q.field('analysisId'), undefined))
        .collect()

      // Get analyses for these messages in parallel
      const analysisPromises = conversationMessages.map(async message => {
        if (message.analysisId) {
          return await ctx.db.get(message.analysisId)
        }
        return null
      })

      const analysisResults = await Promise.all(analysisPromises)
      analyses = analysisResults.filter(
        (analysis): analysis is NonNullable<typeof analysis> =>
          analysis !== null
      )
    } else {
      // Get all analyses efficiently
      analyses = await ctx.db.query('analyses').collect()
    }

    // Calculate statistics with single pass
    const stats = {
      total: analyses.length,
      byType: {
        question: 0,
        opinion: 0,
        fact: 0,
        request: 0,
        other: 0,
      },
      averageConfidence: 0,
      totalVotes: 0,
      positiveVotes: 0,
      negativeVotes: 0,
    }

    let totalConfidence = 0

    // Single pass calculation for better performance
    for (const analysis of analyses) {
      if (analysis.statementType in stats.byType) {
        ;(stats.byType as any)[analysis.statementType]++
      }
      totalConfidence += analysis.confidenceLevel
      stats.totalVotes += analysis.thumbsUp + analysis.thumbsDown
      stats.positiveVotes += analysis.thumbsUp
      stats.negativeVotes += analysis.thumbsDown
    }

    if (analyses.length > 0) {
      stats.averageConfidence =
        Math.round((totalConfidence / analyses.length) * 100) / 100
    }

    return stats
  },
})

// Live query for real-time vote updates
export const getVoteUpdates = query({
  args: {
    analysisIds: v.array(v.id('analyses')),
  },
  handler: async (ctx, args) => {
    if (args.analysisIds.length === 0) {
      return []
    }

    // Fetch all analyses and return their vote data
    const analyses = await Promise.all(
      args.analysisIds.map(async id => {
        const analysis = await ctx.db.get(id)
        if (!analysis) return null

        return {
          analysisId: analysis._id,
          thumbsUp: analysis.thumbsUp,
          thumbsDown: analysis.thumbsDown,
          userVotes: analysis.userVotes,
        }
      })
    )

    return analyses.filter(Boolean)
  },
})

// Vote aggregation queries for analytics and metrics

// Get vote statistics for a specific analysis
export const getAnalysisVoteStats = query({
  args: {
    analysisId: v.id('analyses'),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId)
    if (!analysis) {
      throw new Error('Analysis not found')
    }

    const totalVotes = analysis.thumbsUp + analysis.thumbsDown
    const voteScore = totalVotes > 0 ? analysis.thumbsUp / totalVotes : 0
    const engagement = analysis.userVotes.length

    return {
      analysisId: analysis._id,
      thumbsUp: analysis.thumbsUp,
      thumbsDown: analysis.thumbsDown,
      totalVotes,
      voteScore,
      engagement,
      positiveRatio: voteScore,
      negativeRatio: 1 - voteScore,
      userVoteCount: analysis.userVotes.length,
    }
  },
})

// Get top analyses by vote score (most popular)
export const getMostPopularAnalyses = query({
  args: {
    limit: v.optional(v.number()),
    conversationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10

    let analysesQuery = ctx.db.query('analyses')

    // Filter by conversation if provided
    if (args.conversationId) {
      // First get messages in the conversation
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_conversation', q =>
          q.eq('conversationId', args.conversationId)
        )
        .collect()

      const messageIds = messages.map(m => m._id)
      const analyses = await Promise.all(
        messageIds.map(async messageId => {
          return await ctx.db
            .query('analyses')
            .withIndex('by_message', q => q.eq('messageId', messageId))
            .first()
        })
      )

      const validAnalyses = analyses.filter(Boolean)

      // Calculate vote scores and sort
      const analysesWithScores = validAnalyses.map(analysis => {
        const totalVotes = analysis.thumbsUp + analysis.thumbsDown
        const voteScore = totalVotes > 0 ? analysis.thumbsUp / totalVotes : 0
        return {
          ...analysis,
          totalVotes,
          voteScore,
          engagement: analysis.userVotes.length,
        }
      })

      return analysesWithScores
        .sort((a, b) => {
          // Primary sort: vote score (higher is better)
          if (b.voteScore !== a.voteScore) {
            return b.voteScore - a.voteScore
          }
          // Secondary sort: total votes (more engagement)
          return b.totalVotes - a.totalVotes
        })
        .slice(0, limit)
    }

    // Global popular analyses
    const analyses = await ctx.db
      .query('analyses')
      .withIndex('by_thumbs_up')
      .order('desc')
      .take(50) // Get more to calculate scores

    const analysesWithScores = analyses.map(analysis => {
      const totalVotes = analysis.thumbsUp + analysis.thumbsDown
      const voteScore = totalVotes > 0 ? analysis.thumbsUp / totalVotes : 0
      return {
        ...analysis,
        totalVotes,
        voteScore,
        engagement: analysis.userVotes.length,
      }
    })

    return analysesWithScores
      .sort((a, b) => {
        // Primary sort: vote score (higher is better)
        if (b.voteScore !== a.voteScore) {
          return b.voteScore - a.voteScore
        }
        // Secondary sort: total votes (more engagement)
        return b.totalVotes - a.totalVotes
      })
      .slice(0, limit)
  },
})

// Get least popular analyses (for identifying problematic content)
export const getLeastPopularAnalyses = query({
  args: {
    limit: v.optional(v.number()),
    conversationId: v.optional(v.string()),
    minVotes: v.optional(v.number()), // Only include analyses with at least this many votes
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10
    const minVotes = args.minVotes || 3

    let analyses: any[] = []

    if (args.conversationId) {
      // Get analyses for specific conversation
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_conversation', q =>
          q.eq('conversationId', args.conversationId)
        )
        .collect()

      const messageIds = messages.map(m => m._id)
      const conversationAnalyses = await Promise.all(
        messageIds.map(async messageId => {
          return await ctx.db
            .query('analyses')
            .withIndex('by_message', q => q.eq('messageId', messageId))
            .first()
        })
      )

      analyses = conversationAnalyses.filter(Boolean)
    } else {
      // Get global analyses
      analyses = await ctx.db.query('analyses').collect()
    }

    // Filter and calculate scores
    const analysesWithScores = analyses
      .filter(analysis => {
        const totalVotes = analysis.thumbsUp + analysis.thumbsDown
        return totalVotes >= minVotes
      })
      .map(analysis => {
        const totalVotes = analysis.thumbsUp + analysis.thumbsDown
        const voteScore = totalVotes > 0 ? analysis.thumbsUp / totalVotes : 0
        return {
          ...analysis,
          totalVotes,
          voteScore,
          engagement: analysis.userVotes.length,
        }
      })

    return analysesWithScores
      .sort((a, b) => {
        // Primary sort: vote score (lower is worse)
        if (a.voteScore !== b.voteScore) {
          return a.voteScore - b.voteScore
        }
        // Secondary sort: total votes (more data is better for insights)
        return b.totalVotes - a.totalVotes
      })
      .slice(0, limit)
  },
})

// Get user voting patterns and statistics
export const getUserVotingPatterns = query({
  args: {
    userId: v.string(),
    timeRange: v.optional(v.number()), // Hours to look back
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 24 * 7 // Default to 7 days
    const cutoffTime = getCurrentTimestamp() - timeRange * 60 * 60 * 1000

    // Get all analyses and filter for user votes
    const analyses = await ctx.db.query('analyses').collect()

    let userUpvotes = 0
    let userDownvotes = 0
    let totalUserVotes = 0
    let recentVotes = 0
    const votedAnalyses: any[] = []

    analyses.forEach(analysis => {
      const userVote = analysis.userVotes.find(
        vote => vote.userId === args.userId
      )
      if (userVote) {
        totalUserVotes++
        if (userVote.voteType === 'up') {
          userUpvotes++
        } else {
          userDownvotes++
        }

        if (userVote.timestamp >= cutoffTime) {
          recentVotes++
        }

        votedAnalyses.push({
          analysisId: analysis._id,
          messageId: analysis.messageId,
          voteType: userVote.voteType,
          timestamp: userVote.timestamp,
          statementType: analysis.statementType,
          confidenceLevel: analysis.confidenceLevel,
        })
      }
    })

    const positiveVoteRatio =
      totalUserVotes > 0 ? userUpvotes / totalUserVotes : 0

    return {
      userId: args.userId,
      totalVotes: totalUserVotes,
      upvotes: userUpvotes,
      downvotes: userDownvotes,
      positiveVoteRatio,
      recentVotes,
      timeRangeHours: timeRange,
      votingActivity: votedAnalyses.sort((a, b) => b.timestamp - a.timestamp),
      statistics: {
        averageVotesPerDay: recentVotes / (timeRange / 24),
        mostVotedStatementType: getMostFrequentStatementType(votedAnalyses),
        engagement: totalUserVotes > 0 ? 'active' : 'inactive',
      },
    }
  },
})

// Get overall vote aggregation statistics
export const getVoteAggregationStats = query({
  args: {
    conversationId: v.optional(v.string()),
    timeRange: v.optional(v.number()), // Hours to look back
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange
    const cutoffTime = timeRange
      ? getCurrentTimestamp() - timeRange * 60 * 60 * 1000
      : 0

    let analyses: any[] = []

    if (args.conversationId) {
      // Get analyses for specific conversation
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_conversation', q =>
          q.eq('conversationId', args.conversationId)
        )
        .collect()

      const messageIds = messages.map(m => m._id)
      const conversationAnalyses = await Promise.all(
        messageIds.map(async messageId => {
          return await ctx.db
            .query('analyses')
            .withIndex('by_message', q => q.eq('messageId', messageId))
            .first()
        })
      )

      analyses = conversationAnalyses.filter(Boolean)
    } else {
      // Get all analyses
      analyses = await ctx.db.query('analyses').collect()
    }

    // Filter by time range if specified
    if (timeRange) {
      analyses = analyses.filter(analysis => analysis.createdAt >= cutoffTime)
    }

    // Calculate aggregated statistics
    let totalAnalyses = analyses.length
    let totalUpvotes = 0
    let totalDownvotes = 0
    let totalEngagement = 0
    let votedAnalyses = 0
    const statementTypeStats = {
      question: { count: 0, avgVotes: 0, avgScore: 0 },
      opinion: { count: 0, avgVotes: 0, avgScore: 0 },
      fact: { count: 0, avgVotes: 0, avgScore: 0 },
      request: { count: 0, avgVotes: 0, avgScore: 0 },
      other: { count: 0, avgVotes: 0, avgScore: 0 },
    }

    analyses.forEach(analysis => {
      totalUpvotes += analysis.thumbsUp
      totalDownvotes += analysis.thumbsDown
      totalEngagement += analysis.userVotes.length

      const totalVotes = analysis.thumbsUp + analysis.thumbsDown
      if (totalVotes > 0) {
        votedAnalyses++
      }

      // Statement type statistics
      const statType = analysis.statementType
      if (statType in statementTypeStats) {
        statementTypeStats[statType].count++
        statementTypeStats[statType].avgVotes += totalVotes
        if (totalVotes > 0) {
          statementTypeStats[statType].avgScore +=
            analysis.thumbsUp / totalVotes
        }
      }
    })

    // Calculate averages for statement types
    Object.keys(statementTypeStats).forEach(type => {
      const stats = statementTypeStats[type]
      if (stats.count > 0) {
        stats.avgVotes = stats.avgVotes / stats.count
        stats.avgScore = stats.avgScore / stats.count
      }
    })

    const totalVotes = totalUpvotes + totalDownvotes
    const overallVoteScore = totalVotes > 0 ? totalUpvotes / totalVotes : 0
    const engagementRate = totalAnalyses > 0 ? votedAnalyses / totalAnalyses : 0
    const avgVotesPerAnalysis =
      totalAnalyses > 0 ? totalVotes / totalAnalyses : 0

    return {
      period: {
        timeRangeHours: timeRange,
        analysisCount: totalAnalyses,
      },
      votes: {
        totalUpvotes,
        totalDownvotes,
        totalVotes,
        overallVoteScore,
        positiveRatio: overallVoteScore,
        negativeRatio: 1 - overallVoteScore,
      },
      engagement: {
        totalEngagement,
        votedAnalyses,
        engagementRate,
        avgVotesPerAnalysis,
        avgEngagementPerAnalysis:
          totalAnalyses > 0 ? totalEngagement / totalAnalyses : 0,
      },
      byStatementType: statementTypeStats,
      insights: {
        mostEngagedType: Object.entries(statementTypeStats).reduce((a, b) =>
          statementTypeStats[a[0]].avgVotes > statementTypeStats[b[0]].avgVotes
            ? a
            : b
        )[0],
        highestRatedType: Object.entries(statementTypeStats).reduce((a, b) =>
          statementTypeStats[a[0]].avgScore > statementTypeStats[b[0]].avgScore
            ? a
            : b
        )[0],
      },
    }
  },
})

// Helper functions for vote calculations and analysis

// Calculate vote score (ratio of upvotes to total votes)
export function calculateVoteScore(
  thumbsUp: number,
  thumbsDown: number
): number {
  const totalVotes = thumbsUp + thumbsDown
  return totalVotes > 0 ? thumbsUp / totalVotes : 0
}

// Calculate engagement score based on total vote count and user participation
export function calculateEngagementScore(analysis: any): number {
  const totalVotes = analysis.thumbsUp + analysis.thumbsDown
  const uniqueVoters = analysis.userVotes.length

  // Engagement score combines total votes and unique voter participation
  // Higher weight on unique voters as it indicates broader engagement
  return totalVotes * 0.4 + uniqueVoters * 0.6
}

// Sort analyses by various criteria
export function sortAnalysesByScore(
  analyses: any[],
  sortBy: 'score' | 'engagement' | 'recent' | 'controversial' = 'score'
): any[] {
  return analyses.sort((a, b) => {
    switch (sortBy) {
      case 'score':
        // Higher positive ratio is better
        const scoreA = calculateVoteScore(a.thumbsUp, a.thumbsDown)
        const scoreB = calculateVoteScore(b.thumbsUp, b.thumbsDown)
        if (scoreB !== scoreA) return scoreB - scoreA
        // Secondary sort by total votes
        return b.thumbsUp + b.thumbsDown - (a.thumbsUp + a.thumbsDown)

      case 'engagement':
        // More total engagement is better
        const engagementA = calculateEngagementScore(a)
        const engagementB = calculateEngagementScore(b)
        return engagementB - engagementA

      case 'recent':
        // More recent is better
        return b.createdAt - a.createdAt

      case 'controversial':
        // Analyses with close to 50/50 split are more controversial
        const totalA = a.thumbsUp + a.thumbsDown
        const totalB = b.thumbsUp + b.thumbsDown
        if (totalA === 0 && totalB === 0) return 0
        if (totalA === 0) return 1
        if (totalB === 0) return -1

        const controversyA = Math.abs(0.5 - a.thumbsUp / totalA)
        const controversyB = Math.abs(0.5 - b.thumbsUp / totalB)
        // Lower controversy score means more controversial (closer to 0.5)
        if (controversyA !== controversyB) return controversyA - controversyB
        // Secondary sort by total votes (more data is better for controversy)
        return totalB - totalA

      default:
        return 0
    }
  })
}

// Get most frequent statement type from voted analyses
function getMostFrequentStatementType(votedAnalyses: any[]): string | null {
  if (votedAnalyses.length === 0) return null

  const typeCounts = votedAnalyses.reduce(
    (acc, analysis) => {
      acc[analysis.statementType] = (acc[analysis.statementType] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return Object.entries(typeCounts).reduce((a, b) =>
    typeCounts[a[0]] > typeCounts[b[0]] ? a : b
  )[0]
}

// Calculate vote trend over time
export function calculateVoteTrend(
  analyses: any[],
  timeWindowHours: number = 24
): {
  current: number
  previous: number
  trend: 'up' | 'down' | 'stable'
  changePercent: number
} {
  const now = getCurrentTimestamp()
  const windowMs = timeWindowHours * 60 * 60 * 1000
  const currentWindow = now - windowMs
  const previousWindow = now - windowMs * 2

  let currentVotes = 0
  let previousVotes = 0

  analyses.forEach(analysis => {
    const totalVotes = analysis.thumbsUp + analysis.thumbsDown

    if (analysis.createdAt >= currentWindow) {
      currentVotes += totalVotes
    } else if (analysis.createdAt >= previousWindow) {
      previousVotes += totalVotes
    }
  })

  let trend: 'up' | 'down' | 'stable' = 'stable'
  let changePercent = 0

  if (previousVotes > 0) {
    changePercent = ((currentVotes - previousVotes) / previousVotes) * 100
    if (changePercent > 5) trend = 'up'
    else if (changePercent < -5) trend = 'down'
  } else if (currentVotes > 0) {
    trend = 'up'
    changePercent = 100
  }

  return {
    current: currentVotes,
    previous: previousVotes,
    trend,
    changePercent,
  }
}

// Get vote distribution percentiles
export function getVoteDistributionPercentiles(analyses: any[]): {
  p25: number
  p50: number
  p75: number
  p90: number
  p95: number
} {
  const voteScores = analyses
    .map(analysis => calculateVoteScore(analysis.thumbsUp, analysis.thumbsDown))
    .sort((a, b) => a - b)

  if (voteScores.length === 0) {
    return { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 }
  }

  const getPercentile = (arr: number[], percentile: number) => {
    const index = Math.ceil((percentile / 100) * arr.length) - 1
    return arr[Math.max(0, index)]
  }

  return {
    p25: getPercentile(voteScores, 25),
    p50: getPercentile(voteScores, 50),
    p75: getPercentile(voteScores, 75),
    p90: getPercentile(voteScores, 90),
    p95: getPercentile(voteScores, 95),
  }
}
