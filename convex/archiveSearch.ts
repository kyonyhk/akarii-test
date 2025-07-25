import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { Id } from './_generated/dataModel'

// Search across archived conversations
export const searchArchives = query({
  args: {
    query: v.string(),
    archiveIds: v.optional(v.array(v.id('conversationArchives'))),
    contentTypes: v.optional(
      v.array(
        v.union(
          v.literal('message'),
          v.literal('summary'),
          v.literal('insight'),
          v.literal('metadata')
        )
      )
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    if (!args.query.trim()) {
      return { results: [], totalCount: 0 }
    }

    // Get user's accessible archives
    const accessibleArchives = await getUserAccessibleArchives(
      ctx,
      identity.subject
    )
    const accessibleArchiveIds = new Set(accessibleArchives.map(a => a._id))

    // Filter by requested archive IDs if provided
    let targetArchiveIds = accessibleArchiveIds
    if (args.archiveIds && args.archiveIds.length > 0) {
      targetArchiveIds = new Set(
        args.archiveIds.filter(id => accessibleArchiveIds.has(id))
      )
    }

    if (targetArchiveIds.size === 0) {
      return { results: [], totalCount: 0 }
    }

    // Search using the search index
    const searchResults = await ctx.db
      .query('archiveSearchIndex')
      .withSearchIndex('search_content', q =>
        q.search('content', args.query).filter(
          q =>
            args.contentTypes
              ? q.or(
                  ...args.contentTypes.map(type =>
                    q.eq(q.field('contentType'), type)
                  )
                )
              : q.neq(q.field('contentType'), '') // All content types
        )
      )
      .collect()

    // Filter by accessible archives
    const filteredResults = searchResults.filter(result =>
      targetArchiveIds.has(result.archiveId)
    )

    // Sort by relevance (search rank) and timestamp
    filteredResults.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    const offset = args.offset || 0
    const limit = args.limit || 20
    const paginatedResults = filteredResults.slice(offset, offset + limit)

    // Enrich results with archive information
    const enrichedResults = await Promise.all(
      paginatedResults.map(async result => {
        const archive = accessibleArchives.find(a => a._id === result.archiveId)
        return {
          ...result,
          archive: archive
            ? {
                _id: archive._id,
                title: archive.title,
                archivedAt: archive.archivedAt,
                metadata: archive.metadata,
              }
            : null,
        }
      })
    )

    return {
      results: enrichedResults,
      totalCount: filteredResults.length,
    }
  },
})

// Advanced search with boolean operators and filters
export const advancedSearchArchives = query({
  args: {
    query: v.string(),
    filters: v.object({
      archiveIds: v.optional(v.array(v.id('conversationArchives'))),
      contentTypes: v.optional(
        v.array(
          v.union(
            v.literal('message'),
            v.literal('summary'),
            v.literal('insight'),
            v.literal('metadata')
          )
        )
      ),
      dateRange: v.optional(
        v.object({
          start: v.number(),
          end: v.number(),
        })
      ),
      tags: v.optional(v.array(v.string())),
      categories: v.optional(v.array(v.string())),
      priorities: v.optional(
        v.array(
          v.union(
            v.literal('low'),
            v.literal('medium'),
            v.literal('high'),
            v.literal('critical')
          )
        )
      ),
    }),
    sortBy: v.optional(
      v.union(
        v.literal('relevance'),
        v.literal('date'),
        v.literal('archive_date')
      )
    ),
    sortOrder: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    if (!args.query.trim()) {
      return { results: [], totalCount: 0, facets: {} }
    }

    // Get user's accessible archives with filters applied
    const accessibleArchives = await getUserAccessibleArchivesWithFilters(
      ctx,
      identity.subject,
      args.filters
    )

    const accessibleArchiveIds = new Set(accessibleArchives.map(a => a._id))

    if (accessibleArchiveIds.size === 0) {
      return { results: [], totalCount: 0, facets: {} }
    }

    // Parse boolean query (simplified implementation)
    const searchTerms = parseSearchQuery(args.query)

    // Search across content
    let searchResults = await ctx.db
      .query('archiveSearchIndex')
      .withSearchIndex('search_content', q =>
        q
          .search('content', searchTerms.mainQuery)
          .filter(q =>
            args.filters.contentTypes
              ? q.or(
                  ...args.filters.contentTypes.map(type =>
                    q.eq(q.field('contentType'), type)
                  )
                )
              : q.neq(q.field('contentType'), '')
          )
      )
      .collect()

    // Filter by accessible archives
    searchResults = searchResults.filter(result =>
      accessibleArchiveIds.has(result.archiveId)
    )

    // Apply date range filter on search results
    if (args.filters.dateRange) {
      searchResults = searchResults.filter(
        result =>
          result.createdAt >= args.filters.dateRange!.start &&
          result.createdAt <= args.filters.dateRange!.end
      )
    }

    // Apply additional boolean logic
    if (
      searchTerms.mustInclude.length > 0 ||
      searchTerms.mustExclude.length > 0
    ) {
      searchResults = searchResults.filter(result => {
        const content = result.content.toLowerCase()

        // Must include all required terms
        const hasAllRequired = searchTerms.mustInclude.every(term =>
          content.includes(term.toLowerCase())
        )

        // Must not include any excluded terms
        const hasNoExcluded = searchTerms.mustExclude.every(
          term => !content.includes(term.toLowerCase())
        )

        return hasAllRequired && hasNoExcluded
      })
    }

    // Sort results
    const sortBy = args.sortBy || 'relevance'
    const sortOrder = args.sortOrder || 'desc'

    if (sortBy === 'date') {
      searchResults.sort((a, b) =>
        sortOrder === 'desc'
          ? b.createdAt - a.createdAt
          : a.createdAt - b.createdAt
      )
    } else if (sortBy === 'archive_date') {
      const archiveMap = new Map(
        accessibleArchives.map(a => [a._id, a.archivedAt])
      )
      searchResults.sort((a, b) => {
        const aDate = archiveMap.get(a.archiveId) || 0
        const bDate = archiveMap.get(b.archiveId) || 0
        return sortOrder === 'desc' ? bDate - aDate : aDate - bDate
      })
    }
    // For relevance, results are already sorted by search ranking

    // Apply pagination
    const offset = args.offset || 0
    const limit = args.limit || 20
    const paginatedResults = searchResults.slice(offset, offset + limit)

    // Enrich results with archive information
    const enrichedResults = await Promise.all(
      paginatedResults.map(async result => {
        const archive = accessibleArchives.find(a => a._id === result.archiveId)
        return {
          ...result,
          archive: archive
            ? {
                _id: archive._id,
                title: archive.title,
                archivedAt: archive.archivedAt,
                metadata: archive.metadata,
              }
            : null,
        }
      })
    )

    // Generate facets for filtering
    const facets = generateSearchFacets(searchResults, accessibleArchives)

    return {
      results: enrichedResults,
      totalCount: searchResults.length,
      facets,
    }
  },
})

// Search within a specific archive
export const searchWithinArchive = query({
  args: {
    archiveId: v.id('conversationArchives'),
    query: v.string(),
    contentTypes: v.optional(
      v.array(
        v.union(
          v.literal('message'),
          v.literal('summary'),
          v.literal('insight'),
          v.literal('metadata')
        )
      )
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Check access to the specific archive
    const archive = await ctx.db.get(args.archiveId)
    if (!archive) {
      throw new Error('Archive not found')
    }

    const hasAccess = await checkArchiveAccess(ctx, archive, identity.subject)
    if (!hasAccess) {
      throw new Error('Not authorized to search this archive')
    }

    if (!args.query.trim()) {
      return { results: [], totalCount: 0 }
    }

    // Search within the specific archive
    const searchResults = await ctx.db
      .query('archiveSearchIndex')
      .withSearchIndex('search_content', q =>
        q
          .search('content', args.query)
          .filter(q => q.eq(q.field('archiveId'), args.archiveId))
          .filter(q =>
            args.contentTypes
              ? q.or(
                  ...args.contentTypes.map(type =>
                    q.eq(q.field('contentType'), type)
                  )
                )
              : q.neq(q.field('contentType'), '')
          )
      )
      .collect()

    // Sort by relevance and timestamp
    searchResults.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    const offset = args.offset || 0
    const limit = args.limit || 50
    const paginatedResults = searchResults.slice(offset, offset + limit)

    return {
      results: paginatedResults.map(result => ({
        ...result,
        archive: {
          _id: archive._id,
          title: archive.title,
          archivedAt: archive.archivedAt,
          metadata: archive.metadata,
        },
      })),
      totalCount: searchResults.length,
    }
  },
})

// Get search suggestions based on keywords and archive content
export const getSearchSuggestions = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    if (args.query.length < 2) {
      return []
    }

    const limit = args.limit || 10

    // Get accessible archives
    const accessibleArchives = await getUserAccessibleArchives(
      ctx,
      identity.subject
    )
    const accessibleArchiveIds = new Set(accessibleArchives.map(a => a._id))

    if (accessibleArchiveIds.size === 0) {
      return []
    }

    // Search for matching keywords
    const searchIndex = await ctx.db.query('archiveSearchIndex').collect()

    const filteredIndex = searchIndex.filter(item =>
      accessibleArchiveIds.has(item.archiveId)
    )

    // Extract matching keywords
    const queryLower = args.query.toLowerCase()
    const matchingKeywords = new Set<string>()

    filteredIndex.forEach(item => {
      item.keywords.forEach(keyword => {
        if (keyword.includes(queryLower) && keyword !== queryLower) {
          matchingKeywords.add(keyword)
        }
      })
    })

    // Also look for content matches
    const contentMatches = filteredIndex
      .filter(item => item.content.toLowerCase().includes(queryLower))
      .map(item => {
        // Extract phrases around the match
        const content = item.content.toLowerCase()
        const index = content.indexOf(queryLower)
        const start = Math.max(0, index - 20)
        const end = Math.min(content.length, index + queryLower.length + 20)
        return content.substring(start, end).trim()
      })
      .slice(0, 3)

    // Combine and rank suggestions
    const suggestions = [
      ...Array.from(matchingKeywords).slice(0, limit - contentMatches.length),
      ...contentMatches,
    ].slice(0, limit)

    return suggestions
  },
})

// Helper functions

async function getUserAccessibleArchives(ctx: any, userId: string) {
  const allArchives = await ctx.db.query('conversationArchives').collect()

  return allArchives.filter(archive => {
    // User archived it
    if (archive.archivedBy === userId) return true

    // User was a participant and access level allows it
    if (archive.originalParticipants.includes(userId)) {
      return ['participants', 'team', 'public'].includes(
        archive.metadata.accessLevel
      )
    }

    // Public access
    return archive.metadata.accessLevel === 'public'
  })
}

async function getUserAccessibleArchivesWithFilters(
  ctx: any,
  userId: string,
  filters: any
) {
  let archives = await getUserAccessibleArchives(ctx, userId)

  // Apply filters
  if (filters.archiveIds && filters.archiveIds.length > 0) {
    const requestedIds = new Set(filters.archiveIds)
    archives = archives.filter(a => requestedIds.has(a._id))
  }

  if (filters.dateRange) {
    archives = archives.filter(
      a =>
        a.archivedAt >= filters.dateRange.start &&
        a.archivedAt <= filters.dateRange.end
    )
  }

  if (filters.tags && filters.tags.length > 0) {
    archives = archives.filter(a =>
      filters.tags.some((tag: string) => a.metadata.tags.includes(tag))
    )
  }

  if (filters.categories && filters.categories.length > 0) {
    archives = archives.filter(
      a =>
        a.metadata.category && filters.categories.includes(a.metadata.category)
    )
  }

  if (filters.priorities && filters.priorities.length > 0) {
    archives = archives.filter(a =>
      filters.priorities.includes(a.metadata.priority)
    )
  }

  return archives
}

async function checkArchiveAccess(
  ctx: any,
  archive: any,
  userId: string
): Promise<boolean> {
  return (
    archive.archivedBy === userId ||
    (archive.originalParticipants.includes(userId) &&
      ['participants', 'team', 'public'].includes(
        archive.metadata.accessLevel
      )) ||
    archive.metadata.accessLevel === 'public'
  )
}

function parseSearchQuery(query: string) {
  // Simple boolean query parser
  const mustInclude: string[] = []
  const mustExclude: string[] = []
  let mainQuery = query

  // Extract terms with + (must include) and - (must exclude)
  const plusTerms = query.match(/\+\w+/g) || []
  const minusTerms = query.match(/-\w+/g) || []

  plusTerms.forEach(term => {
    mustInclude.push(term.substring(1))
    mainQuery = mainQuery.replace(term, '').trim()
  })

  minusTerms.forEach(term => {
    mustExclude.push(term.substring(1))
    mainQuery = mainQuery.replace(term, '').trim()
  })

  return {
    mainQuery: mainQuery || query,
    mustInclude,
    mustExclude,
  }
}

function generateSearchFacets(searchResults: any[], archives: any[]) {
  const facets: any = {
    contentTypes: {},
    categories: {},
    priorities: {},
    tags: {},
  }

  // Count content types
  searchResults.forEach(result => {
    facets.contentTypes[result.contentType] =
      (facets.contentTypes[result.contentType] || 0) + 1
  })

  // Count archive metadata
  const resultArchiveIds = new Set(searchResults.map(r => r.archiveId))
  archives.forEach(archive => {
    if (resultArchiveIds.has(archive._id)) {
      // Categories
      if (archive.metadata.category) {
        facets.categories[archive.metadata.category] =
          (facets.categories[archive.metadata.category] || 0) + 1
      }

      // Priorities
      facets.priorities[archive.metadata.priority] =
        (facets.priorities[archive.metadata.priority] || 0) + 1

      // Tags
      archive.metadata.tags.forEach((tag: string) => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1
      })
    }
  })

  return facets
}
