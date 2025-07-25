'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'

export type ArchiveFilters = {
  category?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
  limit?: number
  offset?: number
}

export type CreateArchiveOptions = {
  conversationId: string
  archiveReason?: string
  archiveType: 'manual' | 'automatic' | 'bulk'
  metadata: {
    tags: string[]
    category?: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    retentionPeriod?: number
    accessLevel: 'private' | 'participants' | 'team' | 'public'
  }
}

export function useArchives(filters?: ArchiveFilters) {
  const [isLoading, setIsLoading] = useState(false)

  // Queries
  const archives = useQuery(api.archives.getArchivedConversations, filters)

  // Mutations
  const archiveConversation = useMutation(api.archives.archiveConversation)
  const restoreConversation = useMutation(api.archives.restoreConversation)
  const deleteArchive = useMutation(api.archives.deleteArchive)
  const updateArchiveMetadata = useMutation(api.archives.updateArchiveMetadata)
  const generateArchiveSummaries = useMutation(
    api.archiveSummaries.generateArchiveSummaries
  )
  const generateArchiveInsights = useMutation(
    api.archiveInsights.generateArchiveInsights
  )

  const createArchive = async (options: CreateArchiveOptions) => {
    setIsLoading(true)
    try {
      const archiveId = await archiveConversation(options)
      toast.success('Conversation archived successfully')

      // Automatically generate summaries and insights
      try {
        await Promise.all([
          generateArchiveSummaries({ archiveId }),
          generateArchiveInsights({ archiveId }),
        ])
        toast.success('Archive analysis completed')
      } catch (analysisError) {
        console.warn('Failed to generate analysis:', analysisError)
        toast.warning('Archive created but analysis failed')
      }

      return archiveId
    } catch (error) {
      console.error('Failed to archive conversation:', error)
      toast.error('Failed to archive conversation')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const restore = async (archiveId: Id<'conversationArchives'>) => {
    setIsLoading(true)
    try {
      await restoreConversation({ archiveId })
      toast.success('Conversation restored successfully')
    } catch (error) {
      console.error('Failed to restore conversation:', error)
      toast.error('Failed to restore conversation')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const remove = async (archiveId: Id<'conversationArchives'>) => {
    setIsLoading(true)
    try {
      await deleteArchive({ archiveId })
      toast.success('Archive deleted successfully')
    } catch (error) {
      console.error('Failed to delete archive:', error)
      toast.error('Failed to delete archive')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateMetadata = async (
    archiveId: Id<'conversationArchives'>,
    metadata: CreateArchiveOptions['metadata']
  ) => {
    setIsLoading(true)
    try {
      await updateArchiveMetadata({ archiveId, metadata })
      toast.success('Archive metadata updated')
    } catch (error) {
      console.error('Failed to update archive metadata:', error)
      toast.error('Failed to update archive metadata')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const generateAnalysis = async (archiveId: Id<'conversationArchives'>) => {
    setIsLoading(true)
    try {
      await Promise.all([
        generateArchiveSummaries({ archiveId }),
        generateArchiveInsights({ archiveId }),
      ])
      toast.success('Archive analysis generated successfully')
    } catch (error) {
      console.error('Failed to generate analysis:', error)
      toast.error('Failed to generate analysis')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    // Data
    archives,

    // State
    isLoading,

    // Actions
    createArchive,
    restore,
    remove,
    updateMetadata,
    generateAnalysis,
  }
}

export function useArchiveSearch(initialQuery?: string) {
  const [query, setQuery] = useState(initialQuery || '')
  const [filters, setFilters] = useState<{
    archiveIds?: Id<'conversationArchives'>[]
    contentTypes?: ('message' | 'summary' | 'insight' | 'metadata')[]
    dateRange?: { start: number; end: number }
    tags?: string[]
    categories?: string[]
    priorities?: ('low' | 'medium' | 'high' | 'critical')[]
  }>({})
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'archive_date'>(
    'relevance'
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Basic search
  const searchResults = useQuery(
    api.archiveSearch.searchArchives,
    query.trim()
      ? {
          query,
          archiveIds: filters.archiveIds,
          contentTypes: filters.contentTypes,
          limit: 20,
        }
      : 'skip'
  )

  // Advanced search
  const advancedSearchResults = useQuery(
    api.archiveSearch.advancedSearchArchives,
    query.trim()
      ? {
          query,
          filters,
          sortBy,
          sortOrder,
          limit: 20,
        }
      : 'skip'
  )

  // Search suggestions
  const suggestions = useQuery(
    api.archiveSearch.getSearchSuggestions,
    query.length >= 2 ? { query, limit: 8 } : 'skip'
  )

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  return {
    // Search state
    query,
    setQuery,
    filters,
    updateFilters,
    clearFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Results
    basicResults: searchResults,
    advancedResults: advancedSearchResults,
    suggestions,

    // Computed
    hasFilters: Object.values(filters).some(val =>
      Array.isArray(val) ? val.length > 0 : val !== undefined
    ),
  }
}

export function useArchiveInsights(archiveId: Id<'conversationArchives'>) {
  const insights = useQuery(api.archiveInsights.getArchiveInsights, {
    archiveId,
  })
  const summaries = useQuery(api.archiveSummaries.getArchiveSummaries, {
    archiveId,
  })

  const validateInsight = useMutation(api.archiveInsights.validateInsight)
  const deactivateInsight = useMutation(api.archiveInsights.deactivateInsight)
  const updateSummary = useMutation(api.archiveSummaries.updateSummary)

  const validate = async (insightId: Id<'archiveInsights'>) => {
    try {
      await validateInsight({ insightId })
      toast.success('Insight validated')
    } catch (error) {
      console.error('Failed to validate insight:', error)
      toast.error('Failed to validate insight')
    }
  }

  const deactivate = async (insightId: Id<'archiveInsights'>) => {
    try {
      await deactivateInsight({ insightId })
      toast.success('Insight deactivated')
    } catch (error) {
      console.error('Failed to deactivate insight:', error)
      toast.error('Failed to deactivate insight')
    }
  }

  const editSummary = async (
    summaryId: Id<'archiveSummaries'>,
    content: string,
    keyPoints: string[]
  ) => {
    try {
      await updateSummary({ summaryId, content, keyPoints })
      toast.success('Summary updated')
    } catch (error) {
      console.error('Failed to update summary:', error)
      toast.error('Failed to update summary')
    }
  }

  // Computed values
  const insightsByType =
    insights?.reduce(
      (acc, insight) => {
        if (!acc[insight.insightType]) {
          acc[insight.insightType] = []
        }
        acc[insight.insightType].push(insight)
        return acc
      },
      {} as Record<string, typeof insights>
    ) || {}

  const highImpactInsights =
    insights?.filter(
      insight => insight.impact === 'high' || insight.impact === 'critical'
    ) || []

  const validatedInsights =
    insights?.filter(insight => insight.validatedBy) || []

  const summaryByType =
    summaries?.reduce(
      (acc, summary) => {
        acc[summary.summaryType] = summary
        return acc
      },
      {} as Record<string, (typeof summaries)[0]>
    ) || {}

  return {
    // Data
    insights,
    summaries,
    insightsByType,
    highImpactInsights,
    validatedInsights,
    summaryByType,

    // Actions
    validate,
    deactivate,
    editSummary,

    // Computed
    totalInsights: insights?.length || 0,
    avgConfidence: insights?.length
      ? insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
      : 0,
    hasAnalysis: (insights?.length || 0) > 0 || (summaries?.length || 0) > 0,
  }
}
