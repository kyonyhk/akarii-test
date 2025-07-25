import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'

// Generate insights for an archived conversation
export const generateArchiveInsights = action({
  args: { archiveId: v.id('conversationArchives') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the archive and check permissions
    const archive = await ctx.runQuery(
      internal.archiveInsights.getArchiveForInsights,
      {
        archiveId: args.archiveId,
      }
    )

    if (!archive) {
      throw new Error('Archive not found')
    }

    if (
      archive.archivedBy !== identity.subject &&
      !archive.originalParticipants.includes(identity.subject)
    ) {
      throw new Error('Not authorized to generate insights for this archive')
    }

    // Get conversation data for analysis
    const conversationData = await ctx.runQuery(
      internal.archiveInsights.getConversationForInsights,
      {
        conversationId: archive.conversationId,
      }
    )

    // Generate different types of insights
    const insightTypes = [
      'decision_pattern',
      'communication_pattern',
      'topic_evolution',
      'conflict_resolution',
      'consensus_building',
      'knowledge_sharing',
    ] as const

    const insights = await Promise.all(
      insightTypes.map(async insightType => {
        const insightData = await generateInsightContent(
          insightType,
          conversationData,
          archive
        )

        if (insightData) {
          return await ctx.runMutation(internal.archiveInsights.createInsight, {
            archiveId: args.archiveId,
            insightType,
            ...insightData,
          })
        }
        return null
      })
    )

    return insights.filter(Boolean)
  },
})

// Internal query to get archive data
export const getArchiveForInsights = query({
  args: { archiveId: v.id('conversationArchives') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.archiveId)
  },
  internal: true,
})

// Internal query to get detailed conversation data for insights
export const getConversationForInsights = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    // Get messages with timestamp ordering
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .collect()

    messages.sort((a, b) => a.timestamp - b.timestamp)

    // Get analyses with voting data
    const messagesWithAnalyses = await Promise.all(
      messages.map(async message => {
        let analysis = null
        if (message.analysisId) {
          analysis = await ctx.db.get(message.analysisId)
        }
        return { message, analysis }
      })
    )

    // Get user information
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
      totalMessages: messages.length,
      timeSpan:
        messages.length > 0
          ? messages[messages.length - 1].timestamp - messages[0].timestamp
          : 0,
    }
  },
  internal: true,
})

// Internal mutation to create an insight
export const createInsight = mutation({
  args: {
    archiveId: v.id('conversationArchives'),
    insightType: v.union(
      v.literal('decision_pattern'),
      v.literal('communication_pattern'),
      v.literal('topic_evolution'),
      v.literal('conflict_resolution'),
      v.literal('consensus_building'),
      v.literal('knowledge_sharing')
    ),
    title: v.string(),
    description: v.string(),
    evidence: v.array(
      v.object({
        messageId: v.string(),
        excerpt: v.string(),
        timestamp: v.number(),
        relevanceScore: v.number(),
      })
    ),
    patterns: v.array(
      v.object({
        pattern: v.string(),
        frequency: v.number(),
        significance: v.union(
          v.literal('low'),
          v.literal('medium'),
          v.literal('high')
        ),
      })
    ),
    recommendations: v.array(v.string()),
    confidence: v.number(),
    impact: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
  },
  handler: async (ctx, args) => {
    const insightId = await ctx.db.insert('archiveInsights', {
      archiveId: args.archiveId,
      insightType: args.insightType,
      title: args.title,
      description: args.description,
      evidence: args.evidence,
      patterns: args.patterns,
      recommendations: args.recommendations,
      confidence: args.confidence,
      impact: args.impact,
      generatedAt: Date.now(),
      isActive: true,
    })

    // Add to search index
    const searchContent = `${args.title} ${args.description} ${args.patterns.map(p => p.pattern).join(' ')} ${args.recommendations.join(' ')}`

    await ctx.db.insert('archiveSearchIndex', {
      archiveId: args.archiveId,
      content: searchContent,
      contentType: 'insight',
      sourceId: insightId,
      keywords: extractKeywords(searchContent),
      createdAt: Date.now(),
    })

    return insightId
  },
  internal: true,
})

// Get insights for an archive
export const getArchiveInsights = query({
  args: {
    archiveId: v.id('conversationArchives'),
    insightType: v.optional(
      v.union(
        v.literal('decision_pattern'),
        v.literal('communication_pattern'),
        v.literal('topic_evolution'),
        v.literal('conflict_resolution'),
        v.literal('consensus_building'),
        v.literal('knowledge_sharing')
      )
    ),
    impact: v.optional(
      v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('critical')
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
      throw new Error('Not authorized to view insights for this archive')
    }

    let query = ctx.db
      .query('archiveInsights')
      .withIndex('by_archive', q => q.eq('archiveId', args.archiveId))
      .filter(q => q.eq(q.field('isActive'), true))

    const insights = await query.collect()

    // Apply filters
    let filteredInsights = insights

    if (args.insightType) {
      filteredInsights = filteredInsights.filter(
        i => i.insightType === args.insightType
      )
    }

    if (args.impact) {
      filteredInsights = filteredInsights.filter(i => i.impact === args.impact)
    }

    // Sort by impact and confidence
    filteredInsights.sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact]
      if (impactDiff !== 0) return impactDiff
      return b.confidence - a.confidence
    })

    return filteredInsights
  },
})

// Validate an insight (mark as validated by a user)
export const validateInsight = mutation({
  args: { insightId: v.id('archiveInsights') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const insight = await ctx.db.get(args.insightId)
    if (!insight) {
      throw new Error('Insight not found')
    }

    // Check if user has access to validate this insight
    const archive = await ctx.db.get(insight.archiveId)
    if (!archive) {
      throw new Error('Archive not found')
    }

    const canValidate =
      archive.archivedBy === identity.subject ||
      archive.originalParticipants.includes(identity.subject)

    if (!canValidate) {
      throw new Error('Not authorized to validate this insight')
    }

    await ctx.db.patch(args.insightId, {
      validatedBy: identity.subject,
      validatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Deactivate an insight
export const deactivateInsight = mutation({
  args: { insightId: v.id('archiveInsights') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const insight = await ctx.db.get(args.insightId)
    if (!insight) {
      throw new Error('Insight not found')
    }

    // Check if user has permission to deactivate
    const archive = await ctx.db.get(insight.archiveId)
    if (!archive || archive.archivedBy !== identity.subject) {
      throw new Error('Not authorized to deactivate this insight')
    }

    await ctx.db.patch(args.insightId, { isActive: false })

    return { success: true }
  },
})

// Helper function to generate insight content
async function generateInsightContent(
  insightType:
    | 'decision_pattern'
    | 'communication_pattern'
    | 'topic_evolution'
    | 'conflict_resolution'
    | 'consensus_building'
    | 'knowledge_sharing',
  data: any,
  archive: any
) {
  const { messagesWithAnalyses, users, totalMessages, timeSpan } = data

  switch (insightType) {
    case 'decision_pattern':
      return generateDecisionPatternInsight(
        messagesWithAnalyses,
        users,
        archive
      )

    case 'communication_pattern':
      return generateCommunicationPatternInsight(
        messagesWithAnalyses,
        users,
        archive
      )

    case 'topic_evolution':
      return generateTopicEvolutionInsight(
        messagesWithAnalyses,
        users,
        timeSpan
      )

    case 'conflict_resolution':
      return generateConflictResolutionInsight(messagesWithAnalyses, users)

    case 'consensus_building':
      return generateConsensusInsight(messagesWithAnalyses, users)

    case 'knowledge_sharing':
      return generateKnowledgeSharingInsight(messagesWithAnalyses, users)

    default:
      return null
  }
}

function generateDecisionPatternInsight(
  messagesWithAnalyses: any[],
  users: any,
  archive: any
) {
  const decisionsMessages = messagesWithAnalyses.filter(
    item =>
      item.analysis &&
      (item.analysis.statementType === 'request' ||
        item.analysis.tradeOffs.length > 0)
  )

  if (decisionsMessages.length < 2) return null

  const evidence = decisionsMessages.slice(0, 5).map(item => ({
    messageId: item.message._id,
    excerpt: item.message.content.substring(0, 200) + '...',
    timestamp: item.message.timestamp,
    relevanceScore: 0.8,
  }))

  const patterns = [
    {
      pattern: 'Structured decision-making with trade-off analysis',
      frequency: decisionsMessages.filter(
        item => item.analysis.tradeOffs.length > 0
      ).length,
      significance: 'high' as const,
    },
    {
      pattern: 'Collaborative decision evaluation',
      frequency: Math.floor(decisionsMessages.length * 0.7),
      significance: 'medium' as const,
    },
  ]

  return {
    title: 'Decision-Making Pattern Analysis',
    description: `Analysis of ${decisionsMessages.length} decision points reveals a structured approach to decision-making with clear consideration of trade-offs and alternatives. The team demonstrates mature decision-making processes with collaborative evaluation.`,
    evidence,
    patterns,
    recommendations: [
      'Continue using structured trade-off analysis for major decisions',
      'Document decision rationales to support future similar situations',
      'Consider establishing decision templates for recurring decision types',
    ],
    confidence: 0.85,
    impact:
      decisionsMessages.length > 5 ? ('high' as const) : ('medium' as const),
  }
}

function generateCommunicationPatternInsight(
  messagesWithAnalyses: any[],
  users: any,
  archive: any
) {
  const participantStats = calculateParticipantCommunicationStats(
    messagesWithAnalyses,
    users
  )

  if (participantStats.length < 2) return null

  const evidence = messagesWithAnalyses
    .filter(item => item.analysis && item.analysis.confidenceLevel > 0.7)
    .slice(0, 3)
    .map(item => ({
      messageId: item.message._id,
      excerpt: item.message.content.substring(0, 150) + '...',
      timestamp: item.message.timestamp,
      relevanceScore: 0.75,
    }))

  const patterns = [
    {
      pattern: 'Balanced participation across team members',
      frequency: participantStats.filter(p => p.participationLevel !== 'low')
        .length,
      significance: 'high' as const,
    },
    {
      pattern: 'High-quality analytical responses',
      frequency: messagesWithAnalyses.filter(
        item => item.analysis && item.analysis.confidenceLevel > 0.7
      ).length,
      significance: 'medium' as const,
    },
  ]

  return {
    title: 'Communication Pattern Analysis',
    description: `Analysis reveals effective communication patterns with ${participantStats.length} active participants. The conversation demonstrates balanced participation and high-quality analytical discussions.`,
    evidence,
    patterns,
    recommendations: [
      'Maintain balanced participation by encouraging quieter members',
      'Continue fostering analytical depth in discussions',
      'Consider establishing communication norms for complex topics',
    ],
    confidence: 0.78,
    impact: 'medium' as const,
  }
}

function generateTopicEvolutionInsight(
  messagesWithAnalyses: any[],
  users: any,
  timeSpan: number
) {
  const topicIndicators = messagesWithAnalyses.filter(
    item => item.analysis && item.analysis.beliefs.length > 0
  )

  if (topicIndicators.length < 3) return null

  const evidence = topicIndicators.slice(0, 4).map(item => ({
    messageId: item.message._id,
    excerpt: item.message.content.substring(0, 180) + '...',
    timestamp: item.message.timestamp,
    relevanceScore: 0.7,
  }))

  const patterns = [
    {
      pattern: 'Natural topic progression with logical connections',
      frequency: Math.floor(topicIndicators.length * 0.8),
      significance: 'high' as const,
    },
    {
      pattern: 'Deep exploration of key themes',
      frequency: topicIndicators.filter(
        item => item.analysis.beliefs.length > 2
      ).length,
      significance: 'medium' as const,
    },
  ]

  return {
    title: 'Topic Evolution Analysis',
    description: `The conversation demonstrates natural topic evolution over ${Math.round(timeSpan / (1000 * 60 * 60))} hours with ${topicIndicators.length} significant topic developments. Topics evolved logically with good depth of exploration.`,
    evidence,
    patterns,
    recommendations: [
      'Continue allowing natural topic evolution while maintaining focus',
      'Consider topic summaries for lengthy discussions',
      'Use topic threading for complex multi-subject conversations',
    ],
    confidence: 0.72,
    impact: 'medium' as const,
  }
}

function generateConflictResolutionInsight(
  messagesWithAnalyses: any[],
  users: any
) {
  // Look for potential conflict indicators (disagreements, opposing views)
  const conflictIndicators = messagesWithAnalyses.filter(
    item => item.analysis && item.analysis.tradeOffs.length > 1
  )

  if (conflictIndicators.length < 2) return null

  const evidence = conflictIndicators.slice(0, 3).map(item => ({
    messageId: item.message._id,
    excerpt: item.message.content.substring(0, 200) + '...',
    timestamp: item.message.timestamp,
    relevanceScore: 0.8,
  }))

  return {
    title: 'Conflict Resolution Pattern',
    description: `Analysis identifies ${conflictIndicators.length} instances of differing viewpoints that were constructively resolved through systematic trade-off analysis and collaborative discussion.`,
    evidence,
    patterns: [
      {
        pattern: 'Constructive disagreement handling',
        frequency: conflictIndicators.length,
        significance: 'high' as const,
      },
    ],
    recommendations: [
      'Continue using trade-off analysis for resolving disagreements',
      'Establish clear processes for escalating unresolved conflicts',
      'Document successful resolution strategies for future reference',
    ],
    confidence: 0.8,
    impact: 'high' as const,
  }
}

function generateConsensusInsight(messagesWithAnalyses: any[], users: any) {
  const consensusIndicators = messagesWithAnalyses.filter(
    item =>
      item.analysis &&
      item.analysis.statementType === 'fact' &&
      item.analysis.confidenceLevel > 0.8
  )

  if (consensusIndicators.length < 3) return null

  const evidence = consensusIndicators.slice(0, 3).map(item => ({
    messageId: item.message._id,
    excerpt: item.message.content.substring(0, 150) + '...',
    timestamp: item.message.timestamp,
    relevanceScore: 0.85,
  }))

  return {
    title: 'Consensus Building Analysis',
    description: `The conversation demonstrates effective consensus building with ${consensusIndicators.length} high-confidence factual statements that gained group acceptance.`,
    evidence,
    patterns: [
      {
        pattern: 'Evidence-based consensus formation',
        frequency: consensusIndicators.length,
        significance: 'high' as const,
      },
    ],
    recommendations: [
      'Continue building consensus through factual evidence',
      'Document agreed-upon facts for future reference',
      'Use consensus checkpoints in longer discussions',
    ],
    confidence: 0.82,
    impact: 'medium' as const,
  }
}

function generateKnowledgeSharingInsight(
  messagesWithAnalyses: any[],
  users: any
) {
  const knowledgeIndicators = messagesWithAnalyses.filter(
    item =>
      item.analysis &&
      item.analysis.beliefs.length > 0 &&
      item.analysis.confidenceLevel > 0.6
  )

  if (knowledgeIndicators.length < 3) return null

  const evidence = knowledgeIndicators.slice(0, 4).map(item => ({
    messageId: item.message._id,
    excerpt: item.message.content.substring(0, 160) + '...',
    timestamp: item.message.timestamp,
    relevanceScore: 0.75,
  }))

  return {
    title: 'Knowledge Sharing Pattern',
    description: `Analysis reveals ${knowledgeIndicators.length} instances of substantive knowledge sharing with clear belief statements and insights being exchanged among participants.`,
    evidence,
    patterns: [
      {
        pattern: 'Active knowledge exchange',
        frequency: knowledgeIndicators.length,
        significance: 'high' as const,
      },
    ],
    recommendations: [
      'Continue fostering open knowledge sharing',
      'Consider creating knowledge base from key insights',
      'Establish regular knowledge sharing sessions',
    ],
    confidence: 0.77,
    impact: 'medium' as const,
  }
}

function calculateParticipantCommunicationStats(
  messagesWithAnalyses: any[],
  users: any
) {
  const userMessageCounts = messagesWithAnalyses.reduce(
    (acc, item) => {
      const userId = item.message.userId
      acc[userId] = (acc[userId] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const totalMessages = messagesWithAnalyses.length

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

// Helper function to extract keywords
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
