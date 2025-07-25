import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Id } from './_generated/dataModel'

// Archive a conversation with all its messages and analyses
export const archiveConversation = mutation({
  args: {
    conversationId: v.string(),
    archiveReason: v.optional(v.string()),
    archiveType: v.union(
      v.literal('manual'),
      v.literal('automatic'),
      v.literal('bulk')
    ),
    metadata: v.object({
      tags: v.array(v.string()),
      category: v.optional(v.string()),
      priority: v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('critical')
      ),
      retentionPeriod: v.optional(v.number()),
      accessLevel: v.union(
        v.literal('private'),
        v.literal('participants'),
        v.literal('team'),
        v.literal('public')
      ),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get the conversation to archive
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), args.conversationId))
      .first()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Check if user has permission to archive this conversation
    if (!conversation.participants.includes(identity.subject)) {
      throw new Error('Not authorized to archive this conversation')
    }

    // Get all messages for this conversation
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', q =>
        q.eq('conversationId', args.conversationId)
      )
      .collect()

    // Get all analyses for these messages
    const analyses = await Promise.all(
      messages.map(async message => {
        if (message.analysisId) {
          return await ctx.db.get(message.analysisId)
        }
        return null
      })
    )

    const validAnalyses = analyses.filter(Boolean)

    // Calculate time range
    const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b)
    const startDate = timestamps[0] || conversation.createdAt
    const endDate = timestamps[timestamps.length - 1] || conversation.updatedAt
    const duration = endDate - startDate

    // Create the archive entry
    const archiveId = await ctx.db.insert('conversationArchives', {
      conversationId: args.conversationId,
      title: conversation.title,
      originalParticipants: [...conversation.participants],
      archivedBy: identity.subject,
      archiveReason: args.archiveReason,
      archiveType: args.archiveType,
      status: 'processing',
      messageCount: messages.length,
      analysisCount: validAnalyses.length,
      timeRange: {
        startDate,
        endDate,
        duration,
      },
      metadata: args.metadata,
      archivedAt: Date.now(),
      accessCount: 0,
    })

    // Create search index entries for all content
    const searchEntries = []

    // Index messages
    for (const message of messages) {
      searchEntries.push({
        archiveId,
        content: message.content,
        contentType: 'message' as const,
        sourceId: message._id,
        keywords: extractKeywords(message.content),
        createdAt: Date.now(),
      })
    }

    // Index metadata
    const metadataContent = [
      conversation.title,
      ...args.metadata.tags,
      args.metadata.category || '',
      args.archiveReason || '',
    ]
      .filter(Boolean)
      .join(' ')

    if (metadataContent) {
      searchEntries.push({
        archiveId,
        content: metadataContent,
        contentType: 'metadata' as const,
        sourceId: archiveId,
        keywords: extractKeywords(metadataContent),
        createdAt: Date.now(),
      })
    }

    // Insert all search entries
    await Promise.all(
      searchEntries.map(entry => ctx.db.insert('archiveSearchIndex', entry))
    )

    // Mark conversation as archived (set isActive to false)
    await ctx.db.patch(conversation._id, { isActive: false })

    // Update archive status to completed
    await ctx.db.patch(archiveId, { status: 'archived' })

    return archiveId
  },
})

// Get archived conversations for a user
export const getArchivedConversations = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    category: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('critical')
      )
    ),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    let query = ctx.db.query('conversationArchives')

    // Filter by user access (either archived by user or user was participant)
    const archives = await query.collect()

    const userAccessibleArchives = archives.filter(archive => {
      // User archived it
      if (archive.archivedBy === identity.subject) return true

      // User was a participant and access level allows it
      if (archive.originalParticipants.includes(identity.subject)) {
        return ['participants', 'team', 'public'].includes(
          archive.metadata.accessLevel
        )
      }

      // Public access
      return archive.metadata.accessLevel === 'public'
    })

    // Apply filters
    let filteredArchives = userAccessibleArchives

    if (args.category) {
      filteredArchives = filteredArchives.filter(
        a => a.metadata.category === args.category
      )
    }

    if (args.priority) {
      filteredArchives = filteredArchives.filter(
        a => a.metadata.priority === args.priority
      )
    }

    if (args.tags && args.tags.length > 0) {
      filteredArchives = filteredArchives.filter(a =>
        args.tags!.some(tag => a.metadata.tags.includes(tag))
      )
    }

    // Sort by archived date (newest first)
    filteredArchives.sort((a, b) => b.archivedAt - a.archivedAt)

    // Apply pagination
    const offset = args.offset || 0
    const limit = args.limit || 50

    return filteredArchives.slice(offset, offset + limit)
  },
})

// Get a specific archived conversation
export const getArchivedConversation = query({
  args: { archiveId: v.id('conversationArchives') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const archive = await ctx.db.get(args.archiveId)
    if (!archive) {
      throw new Error('Archive not found')
    }

    // Check access permissions
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

    // Update access tracking
    await ctx.db.patch(args.archiveId, {
      lastAccessedAt: Date.now(),
      accessCount: archive.accessCount + 1,
    })

    return archive
  },
})

// Restore an archived conversation
export const restoreConversation = mutation({
  args: { archiveId: v.id('conversationArchives') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const archive = await ctx.db.get(args.archiveId)
    if (!archive) {
      throw new Error('Archive not found')
    }

    // Check if user has permission to restore (only archiver or participants)
    const hasRestorePermission =
      archive.archivedBy === identity.subject ||
      archive.originalParticipants.includes(identity.subject)

    if (!hasRestorePermission) {
      throw new Error('Not authorized to restore this conversation')
    }

    // Find the original conversation
    const conversation = await ctx.db
      .query('conversations')
      .filter(q => q.eq(q.field('_id'), archive.conversationId))
      .first()

    if (!conversation) {
      throw new Error('Original conversation not found')
    }

    // Reactivate the conversation
    await ctx.db.patch(conversation._id, { isActive: true })

    // Update archive status or remove it (depending on requirements)
    // For now, we'll keep the archive but mark it as restored
    await ctx.db.patch(args.archiveId, {
      status: 'archived', // Keep as archived for historical purposes
    })

    return conversation._id
  },
})

// Delete an archive permanently
export const deleteArchive = mutation({
  args: { archiveId: v.id('conversationArchives') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const archive = await ctx.db.get(args.archiveId)
    if (!archive) {
      throw new Error('Archive not found')
    }

    // Only the archiver can delete the archive
    if (archive.archivedBy !== identity.subject) {
      throw new Error('Not authorized to delete this archive')
    }

    // Delete related summaries
    const summaries = await ctx.db
      .query('archiveSummaries')
      .withIndex('by_archive', q => q.eq('archiveId', args.archiveId))
      .collect()

    await Promise.all(summaries.map(summary => ctx.db.delete(summary._id)))

    // Delete related insights
    const insights = await ctx.db
      .query('archiveInsights')
      .withIndex('by_archive', q => q.eq('archiveId', args.archiveId))
      .collect()

    await Promise.all(insights.map(insight => ctx.db.delete(insight._id)))

    // Delete search index entries
    const searchEntries = await ctx.db
      .query('archiveSearchIndex')
      .withIndex('by_archive', q => q.eq('archiveId', args.archiveId))
      .collect()

    await Promise.all(searchEntries.map(entry => ctx.db.delete(entry._id)))

    // Delete the archive itself
    await ctx.db.delete(args.archiveId)

    return { success: true }
  },
})

// Update archive metadata
export const updateArchiveMetadata = mutation({
  args: {
    archiveId: v.id('conversationArchives'),
    metadata: v.object({
      tags: v.array(v.string()),
      category: v.optional(v.string()),
      priority: v.union(
        v.literal('low'),
        v.literal('medium'),
        v.literal('high'),
        v.literal('critical')
      ),
      retentionPeriod: v.optional(v.number()),
      accessLevel: v.union(
        v.literal('private'),
        v.literal('participants'),
        v.literal('team'),
        v.literal('public')
      ),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const archive = await ctx.db.get(args.archiveId)
    if (!archive) {
      throw new Error('Archive not found')
    }

    // Only the archiver can update metadata
    if (archive.archivedBy !== identity.subject) {
      throw new Error('Not authorized to update this archive')
    }

    await ctx.db.patch(args.archiveId, {
      metadata: args.metadata,
    })

    return { success: true }
  },
})

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - split by spaces and filter out common words
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
    .slice(0, 20) // Limit to 20 keywords
}
