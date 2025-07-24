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
      userVotes: {},
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

    // Get current user vote
    const currentVote = (analysis.userVotes as Record<string, 'up' | 'down'>)[
      args.userId
    ]

    // Calculate new vote counts
    let newThumbsUp = analysis.thumbsUp
    let newThumbsDown = analysis.thumbsDown
    const newUserVotes = { ...analysis.userVotes } as Record<
      string,
      'up' | 'down'
    >

    // Remove previous vote if exists
    if (currentVote === 'up') {
      newThumbsUp--
    } else if (currentVote === 'down') {
      newThumbsDown--
    }

    // Add new vote if different from current
    if (currentVote !== args.vote) {
      if (args.vote === 'up') {
        newThumbsUp++
      } else {
        newThumbsDown++
      }
      newUserVotes[args.userId] = args.vote
    } else {
      // Remove vote if same as current (toggle off)
      delete newUserVotes[args.userId]
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
