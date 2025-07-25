import { query } from './_generated/server'
import { v } from 'convex/values'

// Types for search filters
type StatementType = 'question' | 'opinion' | 'fact' | 'request' | 'other'

interface SearchFilters {
  conversationId?: string
  userId?: string
  statementTypes?: StatementType[]
  confidenceRange?: { min: number; max: number }
  dateRange?: { start: number; end: number }
  minVotes?: number
  hasAnalysis?: boolean
}

// Advanced search across messages and analyses
export const advancedSearch = query({
  args: {
    searchTerm: v.optional(v.string()),
    conversationId: v.optional(v.string()),
    userId: v.optional(v.string()),
    statementTypes: v.optional(v.array(v.union(
      v.literal('question'),
      v.literal('opinion'), 
      v.literal('fact'),
      v.literal('request'),
      v.literal('other')
    ))),
    confidenceMin: v.optional(v.number()),
    confidenceMax: v.optional(v.number()),
    dateStart: v.optional(v.number()),
    dateEnd: v.optional(v.number()),
    minVotes: v.optional(v.number()),
    hasAnalysis: v.optional(v.boolean()),
    searchInBeliefs: v.optional(v.boolean()),
    searchInTradeOffs: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const searchTerm = args.searchTerm?.toLowerCase() || ''

    // Get all messages
    const allMessages = await ctx.db.query('messages').order('desc').collect()

    // Apply basic filters
    let filteredMessages = allMessages.filter(message => {
      // Conversation filter
      if (args.conversationId && message.conversationId !== args.conversationId) {
        return false
      }

      // User filter
      if (args.userId && message.userId !== args.userId) {
        return false
      }

      // Date range filter
      if (args.dateStart && message.timestamp < args.dateStart) {
        return false
      }
      if (args.dateEnd && message.timestamp > args.dateEnd) {
        return false
      }

      // Analysis requirement filter
      if (args.hasAnalysis !== undefined) {
        const hasAnalysis = !!message.analysisId
        if (args.hasAnalysis !== hasAnalysis) {
          return false
        }
      }

      return true
    })

    // Get analyses for messages that have them
    const messagesWithAnalysis = await Promise.all(
      filteredMessages.map(async (message) => {
        let analysis = null
        if (message.analysisId) {
          analysis = await ctx.db.get(message.analysisId)
        }

        return {
          message,
          analysis,
        }
      })
    )

    // Apply analysis-based filters
    const analysisFilteredResults = messagesWithAnalysis.filter(({ message, analysis }) => {
      // Statement type filter
      if (args.statementTypes && args.statementTypes.length > 0) {
        if (!analysis || !args.statementTypes.includes(analysis.statementType)) {
          return false
        }
      }

      // Confidence range filter
      if (analysis && (args.confidenceMin !== undefined || args.confidenceMax !== undefined)) {
        const confidence = analysis.confidenceLevel
        if (args.confidenceMin !== undefined && confidence < args.confidenceMin) {
          return false
        }
        if (args.confidenceMax !== undefined && confidence > args.confidenceMax) {
          return false
        }
      }

      // Vote count filter
      if (args.minVotes !== undefined && analysis) {
        const totalVotes = analysis.thumbsUp + analysis.thumbsDown
        if (totalVotes < args.minVotes) {
          return false
        }
      }

      return true
    })

    // Apply text search
    let textFilteredResults = analysisFilteredResults
    if (searchTerm) {
      textFilteredResults = analysisFilteredResults.filter(({ message, analysis }) => {
        // Search in message content
        const contentMatch = message.content.toLowerCase().includes(searchTerm)

        // Search in beliefs if enabled
        let beliefsMatch = false
        if (args.searchInBeliefs && analysis?.beliefs) {
          beliefsMatch = analysis.beliefs.some(belief => 
            belief.toLowerCase().includes(searchTerm)
          )
        }

        // Search in trade-offs if enabled
        let tradeOffsMatch = false
        if (args.searchInTradeOffs && analysis?.tradeOffs) {
          tradeOffsMatch = analysis.tradeOffs.some(tradeOff => 
            tradeOff.toLowerCase().includes(searchTerm)
          )
        }

        return contentMatch || beliefsMatch || tradeOffsMatch
      })
    }

    // Get user information for results
    const resultsWithUsers = await Promise.all(
      textFilteredResults.slice(0, limit).map(async ({ message, analysis }) => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', message.userId))
          .first()

        const userInfo = user ? {
          name: user.name || user.email || 'Unknown User',
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        } : null

        return {
          message: {
            ...message,
            user: userInfo,
          },
          analysis,
        }
      })
    )

    return {
      results: resultsWithUsers,
      totalCount: textFilteredResults.length,
      hasMore: textFilteredResults.length > limit,
    }
  },
})

// Search specifically in beliefs and trade-offs content
export const searchAnalysisContent = query({
  args: {
    searchTerm: v.string(),
    contentType: v.union(v.literal('beliefs'), v.literal('tradeOffs'), v.literal('both')),
    conversationId: v.optional(v.string()),
    statementTypes: v.optional(v.array(v.union(
      v.literal('question'),
      v.literal('opinion'), 
      v.literal('fact'),
      v.literal('request'),
      v.literal('other')
    ))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const searchTerm = args.searchTerm.toLowerCase()

    // Get all analyses
    const allAnalyses = await ctx.db.query('analyses').collect()

    // Filter analyses based on search criteria
    const matchingAnalyses = allAnalyses.filter(analysis => {
      // Statement type filter
      if (args.statementTypes && args.statementTypes.length > 0) {
        if (!args.statementTypes.includes(analysis.statementType)) {
          return false
        }
      }

      // Content search
      let hasMatch = false

      if (args.contentType === 'beliefs' || args.contentType === 'both') {
        hasMatch = analysis.beliefs.some(belief => 
          belief.toLowerCase().includes(searchTerm)
        )
      }

      if (!hasMatch && (args.contentType === 'tradeOffs' || args.contentType === 'both')) {
        hasMatch = analysis.tradeOffs.some(tradeOff => 
          tradeOff.toLowerCase().includes(searchTerm)
        )
      }

      return hasMatch
    })

    // Get corresponding messages with user info
    const resultsWithMessages = await Promise.all(
      matchingAnalyses.slice(0, limit).map(async (analysis) => {
        const message = await ctx.db.get(analysis.messageId)
        if (!message) return null

        // Conversation filter (applied here since we got message)
        if (args.conversationId && message.conversationId !== args.conversationId) {
          return null
        }

        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', message.userId))
          .first()

        const userInfo = user ? {
          name: user.name || user.email || 'Unknown User',
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        } : null

        return {
          message: {
            ...message,
            user: userInfo,
          },
          analysis,
          matchType: args.contentType,
        }
      })
    )

    const validResults = resultsWithMessages.filter(result => result !== null)

    return {
      results: validResults,
      totalCount: validResults.length,
    }
  },
})

// Get search suggestions based on existing content
export const getSearchSuggestions = query({
  args: {
    query: v.string(),
    type: v.union(
      v.literal('messages'),
      v.literal('beliefs'),
      v.literal('tradeOffs'),
      v.literal('all')
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    const query = args.query.toLowerCase()

    if (query.length < 2) {
      return []
    }

    const suggestions = new Set<string>()

    if (args.type === 'messages' || args.type === 'all') {
      // Get message content suggestions
      const messages = await ctx.db.query('messages').collect()
      messages.forEach(message => {
        const words = message.content.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.includes(query) && word.length > 2) {
            suggestions.add(word)
          }
        })
      })
    }

    if (args.type === 'beliefs' || args.type === 'all') {
      // Get beliefs suggestions
      const analyses = await ctx.db.query('analyses').collect()
      analyses.forEach(analysis => {
        analysis.beliefs.forEach(belief => {
          const words = belief.toLowerCase().split(/\s+/)
          words.forEach(word => {
            if (word.includes(query) && word.length > 2) {
              suggestions.add(word)
            }
          })
        })
      })
    }

    if (args.type === 'tradeOffs' || args.type === 'all') {
      // Get trade-offs suggestions
      const analyses = await ctx.db.query('analyses').collect()
      analyses.forEach(analysis => {
        analysis.tradeOffs.forEach(tradeOff => {
          const words = tradeOff.toLowerCase().split(/\s+/)
          words.forEach(word => {
            if (word.includes(query) && word.length > 2) {
              suggestions.add(word)
            }
          })
        })
      })
    }

    return Array.from(suggestions)
      .sort()
      .slice(0, limit)
  },
})

// Get faceted search results for building filter UI
export const getFacetedSearchData = query({
  args: {
    conversationId: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get messages (optionally filtered)
    let messages = await ctx.db.query('messages').collect()

    if (args.conversationId) {
      messages = messages.filter(m => m.conversationId === args.conversationId)
    }

    if (args.userId) {
      messages = messages.filter(m => m.userId === args.userId)
    }

    // Get analyses for these messages
    const analyses = await Promise.all(
      messages
        .filter(m => m.analysisId)
        .map(async (m) => {
          if (m.analysisId) {
            return await ctx.db.get(m.analysisId)
          }
          return null
        })
    )

    const validAnalyses = analyses.filter(a => a !== null)

    // Calculate facets
    const statementTypeCounts = validAnalyses.reduce((acc, analysis) => {
      if (analysis) {
        acc[analysis.statementType] = (acc[analysis.statementType] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const confidenceLevels = validAnalyses.map(a => a?.confidenceLevel || 0)
    const voteCounts = validAnalyses.map(a => (a?.thumbsUp || 0) + (a?.thumbsDown || 0))

    return {
      totalMessages: messages.length,
      messagesWithAnalysis: validAnalyses.length,
      statementTypes: statementTypeCounts,
      confidenceStats: {
        min: Math.min(...confidenceLevels),
        max: Math.max(...confidenceLevels),
        avg: confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length || 0,
      },
      voteStats: {
        min: Math.min(...voteCounts),
        max: Math.max(...voteCounts),
        avg: voteCounts.reduce((a, b) => a + b, 0) / voteCounts.length || 0,
      },
    }
  },
})