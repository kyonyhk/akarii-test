import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'

// Generate summaries for an archived conversation
export const generateArchiveSummaries = action({
  args: { archiveId: v.id('conversationArchives') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the archive
    const archive = await ctx.runQuery(
      internal.archiveSummaries.getArchiveForSummary,
      {
        archiveId: args.archiveId,
      }
    )

    if (!archive) {
      throw new Error('Archive not found')
    }

    // Check permissions
    if (
      archive.archivedBy !== identity.subject &&
      !archive.originalParticipants.includes(identity.subject)
    ) {
      throw new Error('Not authorized to generate summaries for this archive')
    }

    // Get all messages and analyses for this conversation
    const messagesAndAnalyses = await ctx.runQuery(
      internal.archiveSummaries.getConversationData,
      {
        conversationId: archive.conversationId,
      }
    )

    // Generate different types of summaries
    const summaryTypes = [
      'overview',
      'decisions',
      'insights',
      'sentiment',
      'topics',
    ] as const

    const summaries = await Promise.all(
      summaryTypes.map(async summaryType => {
        const summaryContent = await generateSummaryContent(
          summaryType,
          messagesAndAnalyses,
          archive
        )

        return await ctx.runMutation(internal.archiveSummaries.createSummary, {
          archiveId: args.archiveId,
          summaryType,
          ...summaryContent,
        })
      })
    )

    return summaries
  },
})

// Internal query to get archive data
export const getArchiveForSummary = query({
  args: { archiveId: v.id('conversationArchives') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.archiveId)
  },
  internal: true,
})

// Internal query to get conversation messages and analyses
export const getConversationData = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    // Get all messages
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .collect()

    // Get analyses for messages that have them
    const messagesWithAnalyses = await Promise.all(
      messages.map(async message => {
        let analysis = null
        if (message.analysisId) {
          analysis = await ctx.db.get(message.analysisId)
        }
        return { message, analysis }
      })
    )

    // Get user information for participants
    const userIds = [...new Set(messages.map(m => m.userId))]
    const users = await Promise.all(
      userIds.map(async userId => {
        const user = await ctx.db
          .query('users')
          .withIndex('by_clerk_id', q => q.eq('clerkId', userId))
          .first()
        return { userId, user }
      })
    )

    return {
      messagesWithAnalyses,
      users: users.reduce(
        (acc, { userId, user }) => {
          acc[userId] = user
          return acc
        },
        {} as Record<string, any>
      ),
    }
  },
  internal: true,
})

// Internal mutation to create a summary
export const createSummary = mutation({
  args: {
    archiveId: v.id('conversationArchives'),
    summaryType: v.union(
      v.literal('overview'),
      v.literal('decisions'),
      v.literal('insights'),
      v.literal('sentiment'),
      v.literal('topics')
    ),
    content: v.string(),
    keyPoints: v.array(v.string()),
    participants: v.array(
      v.object({
        userId: v.string(),
        name: v.optional(v.string()),
        messageCount: v.number(),
        participationLevel: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
      })
    ),
    statistics: v.object({
      totalMessages: v.number(),
      avgMessageLength: v.number(),
      questionCount: v.number(),
      opinionCount: v.number(),
      factCount: v.number(),
      requestCount: v.number(),
      sentimentScore: v.optional(v.number()),
      confidenceLevel: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const summaryId = await ctx.db.insert('archiveSummaries', {
      archiveId: args.archiveId,
      summaryType: args.summaryType,
      content: args.content,
      keyPoints: args.keyPoints,
      participants: args.participants,
      statistics: args.statistics,
      generatedAt: Date.now(),
      generatedBy: 'gpt-4o-mini', // This would come from the AI service
      version: '1.0',
    })

    // Add to search index
    await ctx.db.insert('archiveSearchIndex', {
      archiveId: args.archiveId,
      content: args.content + ' ' + args.keyPoints.join(' '),
      contentType: 'summary',
      sourceId: summaryId,
      keywords: extractKeywords(args.content + ' ' + args.keyPoints.join(' ')),
      createdAt: Date.now(),
    })

    return summaryId
  },
  internal: true,
})

// Get summaries for an archive
export const getArchiveSummaries = query({
  args: {
    archiveId: v.id('conversationArchives'),
    summaryType: v.optional(
      v.union(
        v.literal('overview'),
        v.literal('decisions'),
        v.literal('insights'),
        v.literal('sentiment'),
        v.literal('topics')
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Check access to the archive
    const archive = await ctx.db.get(args.archiveId)
    if (!archive) {
      throw new Error('Archive not found')
    }

    const hasAccess =
      archive.archivedBy === identity.subject ||
      (archive.originalParticipants.includes(identity.subject) &&
        ['participants', 'team', 'public'].includes(
          archive.metadata.accessLevel
        )) ||
      archive.metadata.accessLevel === 'public'

    if (!hasAccess) {
      throw new Error('Not authorized to view this archive')
    }

    let query = ctx.db
      .query('archiveSummaries')
      .withIndex('by_archive', q => q.eq('archiveId', args.archiveId))

    if (args.summaryType) {
      const summaries = await query.collect()
      return summaries.filter(s => s.summaryType === args.summaryType)
    }

    return await query.collect()
  },
})

// Update a summary (regenerate or edit)
export const updateSummary = mutation({
  args: {
    summaryId: v.id('archiveSummaries'),
    content: v.string(),
    keyPoints: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const summary = await ctx.db.get(args.summaryId)
    if (!summary) {
      throw new Error('Summary not found')
    }

    // Check if user has permission to update
    const archive = await ctx.db.get(summary.archiveId)
    if (!archive || archive.archivedBy !== identity.subject) {
      throw new Error('Not authorized to update this summary')
    }

    // Update the summary
    await ctx.db.patch(args.summaryId, {
      content: args.content,
      keyPoints: args.keyPoints,
      generatedAt: Date.now(),
      version: '1.1', // Increment version
    })

    // Update search index
    const searchEntries = await ctx.db
      .query('archiveSearchIndex')
      .withIndex('by_archive', q => q.eq('archiveId', summary.archiveId))
      .filter(q => q.eq(q.field('sourceId'), args.summaryId))
      .collect()

    if (searchEntries.length > 0) {
      await ctx.db.patch(searchEntries[0]._id, {
        content: args.content + ' ' + args.keyPoints.join(' '),
        keywords: extractKeywords(
          args.content + ' ' + args.keyPoints.join(' ')
        ),
        createdAt: Date.now(),
      })
    }

    return { success: true }
  },
})

// Helper function to generate summary content based on type
async function generateSummaryContent(
  summaryType: 'overview' | 'decisions' | 'insights' | 'sentiment' | 'topics',
  data: any,
  archive: any
) {
  const { messagesWithAnalyses, users } = data
  const messages = messagesWithAnalyses.map((item: any) => item.message)
  const analyses = messagesWithAnalyses
    .map((item: any) => item.analysis)
    .filter(Boolean)

  // Calculate participant statistics
  const participantStats = calculateParticipantStats(messages, users)

  // Calculate message statistics
  const messageStats = calculateMessageStats(messages, analyses)

  // Generate content based on summary type
  let content = ''
  let keyPoints: string[] = []

  switch (summaryType) {
    case 'overview':
      content = generateOverviewSummary(messages, participantStats, archive)
      keyPoints = extractOverviewKeyPoints(messages, analyses)
      break

    case 'decisions':
      content = generateDecisionsSummary(analyses, messages)
      keyPoints = extractDecisionKeyPoints(analyses, messages)
      break

    case 'insights':
      content = generateInsightsSummary(analyses, messages)
      keyPoints = extractInsightKeyPoints(analyses)
      break

    case 'sentiment':
      content = generateSentimentSummary(analyses, messages)
      keyPoints = extractSentimentKeyPoints(analyses)
      break

    case 'topics':
      content = generateTopicsSummary(messages, analyses)
      keyPoints = extractTopicKeyPoints(messages, analyses)
      break
  }

  return {
    content,
    keyPoints,
    participants: participantStats,
    statistics: {
      ...messageStats,
      confidenceLevel: 0.85, // This would come from AI analysis
    },
  }
}

// Helper functions for calculations and content generation
function calculateParticipantStats(
  messages: any[],
  users: Record<string, any>
) {
  const userMessageCounts = messages.reduce(
    (acc, message) => {
      acc[message.userId] = (acc[message.userId] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const totalMessages = messages.length

  return Object.entries(userMessageCounts).map(([userId, messageCount]) => {
    const user = users[userId]
    let participationLevel: 'low' | 'medium' | 'high'

    const percentage = messageCount / totalMessages
    if (percentage > 0.4) participationLevel = 'high'
    else if (percentage > 0.15) participationLevel = 'medium'
    else participationLevel = 'low'

    return {
      userId,
      name: user?.name || 'Unknown User',
      messageCount,
      participationLevel,
    }
  })
}

function calculateMessageStats(messages: any[], analyses: any[]) {
  const totalMessages = messages.length
  const avgMessageLength =
    messages.reduce((sum, msg) => sum + msg.content.length, 0) / totalMessages

  const statementCounts = analyses.reduce(
    (acc, analysis) => {
      if (analysis) {
        acc[analysis.statementType] = (acc[analysis.statementType] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalMessages,
    avgMessageLength: Math.round(avgMessageLength),
    questionCount: statementCounts.question || 0,
    opinionCount: statementCounts.opinion || 0,
    factCount: statementCounts.fact || 0,
    requestCount: statementCounts.request || 0,
    sentimentScore: calculateAverageSentiment(analyses),
  }
}

function calculateAverageSentiment(analyses: any[]): number | undefined {
  // This is a placeholder - in reality, you'd calculate sentiment from the analyses
  const validAnalyses = analyses.filter(a => a && a.confidenceLevel > 0.5)
  if (validAnalyses.length === 0) return undefined

  // Mock sentiment calculation based on confidence levels and statement types
  const sentimentSum = validAnalyses.reduce((sum, analysis) => {
    let sentiment = 0
    if (analysis.statementType === 'opinion') sentiment = 0.1
    else if (analysis.statementType === 'fact') sentiment = 0.3
    else if (analysis.statementType === 'question') sentiment = -0.1

    return sum + sentiment * analysis.confidenceLevel
  }, 0)

  return Math.max(-1, Math.min(1, sentimentSum / validAnalyses.length))
}

// Content generation functions (simplified versions)
function generateOverviewSummary(
  messages: any[],
  participants: any[],
  archive: any
): string {
  const duration = Math.round(
    archive.timeRange.duration / (1000 * 60 * 60 * 24)
  ) // days
  const participantCount = participants.length

  return `This conversation involved ${participantCount} participants over ${duration} days, generating ${messages.length} messages. The discussion covered various topics with active participation from team members. Key themes emerged around decision-making processes and collaborative problem-solving.`
}

function generateDecisionsSummary(analyses: any[], messages: any[]): string {
  const decisionIndicators = analyses.filter(
    a => a && (a.statementType === 'request' || a.tradeOffs.length > 0)
  ).length

  return `The conversation included approximately ${decisionIndicators} decision points or trade-off discussions. Participants engaged in structured decision-making processes, weighing various options and considering multiple perspectives before reaching conclusions.`
}

function generateInsightsSummary(analyses: any[], messages: any[]): string {
  const insightfulMessages = analyses.filter(
    a => a && a.confidenceLevel > 0.7 && a.beliefs.length > 0
  ).length

  return `Analysis revealed ${insightfulMessages} messages containing significant insights or belief statements. The conversation demonstrated thoughtful analysis and reflection, with participants sharing valuable perspectives and learning from each other.`
}

function generateSentimentSummary(analyses: any[], messages: any[]): string {
  return `The overall tone of the conversation was collaborative and constructive. Participants maintained a professional and respectful discourse throughout the discussion, contributing to a positive and productive environment.`
}

function generateTopicsSummary(messages: any[], analyses: any[]): string {
  return `The conversation covered multiple interconnected topics, with natural transitions between different subjects. Participants demonstrated good topic management, staying focused while allowing for organic development of related themes.`
}

// Key point extraction functions (simplified)
function extractOverviewKeyPoints(messages: any[], analyses: any[]): string[] {
  return [
    `${messages.length} total messages exchanged`,
    `${analyses.length} messages received AI analysis`,
    'Active participation from all team members',
    'Structured approach to problem-solving',
    'Clear communication patterns established',
  ]
}

function extractDecisionKeyPoints(analyses: any[], messages: any[]): string[] {
  return [
    'Multiple decision points identified',
    'Trade-offs carefully considered',
    'Consensus-building approach used',
    'Clear action items established',
    'Follow-up responsibilities assigned',
  ]
}

function extractInsightKeyPoints(analyses: any[]): string[] {
  return [
    'Key insights shared and documented',
    'Learning opportunities identified',
    'Best practices discussed',
    'Knowledge transfer facilitated',
    'Strategic implications considered',
  ]
}

function extractSentimentKeyPoints(analyses: any[]): string[] {
  return [
    'Positive and collaborative tone',
    'Respectful disagreement handled well',
    'Constructive feedback provided',
    'Team cohesion demonstrated',
    'Professional communication maintained',
  ]
}

function extractTopicKeyPoints(messages: any[], analyses: any[]): string[] {
  return [
    'Multiple related topics covered',
    'Natural topic transitions',
    'Deep dive into key subjects',
    'Comprehensive coverage achieved',
    'Related themes well connected',
  ]
}

// Helper function to extract keywords (same as in archives.ts)
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'this',
    'that',
    'these',
    'those',
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word))
    .slice(0, 20)
}
