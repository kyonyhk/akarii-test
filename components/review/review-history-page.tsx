'use client'

import { useState } from 'react'
import { MessageHistory } from '@/components/chat/message-history'
import { ConversationSelector } from '@/components/review/conversation-selector'
import { QuickSearchBar } from '@/components/search/quick-search-bar'
import { SearchResults } from '@/components/search/search-results'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Filter, Search, Download, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExportDropdown } from '@/components/export/export-dropdown'
// import { useQuery } from 'convex/react'
// import { api } from '@/convex/_generated/api'

interface ReviewHistoryPageProps {
  userId: string
  userName?: string
}

export function ReviewHistoryPage({
  userId,
  userName = 'Anonymous',
}: ReviewHistoryPageProps) {
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [searchFilters, setSearchFilters] = useState<any>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Search functionality
  // const searchResults = useQuery(
  //   api.search.advancedSearch,
  //   searchFilters ? {
  //     searchTerm: searchFilters.searchTerm || undefined,
  //     conversationId: searchFilters.conversationId || selectedConversationId || undefined,
  //     userId: searchFilters.userId || undefined,
  //     statementTypes: searchFilters.statementTypes?.length > 0 ? searchFilters.statementTypes : undefined,
  //     confidenceMin: searchFilters.confidenceRange?.[0] !== 0 ? searchFilters.confidenceRange[0] : undefined,
  //     confidenceMax: searchFilters.confidenceRange?.[1] !== 100 ? searchFilters.confidenceRange[1] : undefined,
  //     dateStart: searchFilters.dateRange?.start?.getTime(),
  //     dateEnd: searchFilters.dateRange?.end?.getTime(),
  //     minVotes: searchFilters.minVotes > 0 ? searchFilters.minVotes : undefined,
  //     hasAnalysis: searchFilters.hasAnalysis || undefined,
  //     searchInBeliefs: searchFilters.searchInBeliefs || undefined,
  //     searchInTradeOffs: searchFilters.searchInTradeOffs || undefined,
  //     limit: 50,
  //   } : 'skip'
  // )
  const searchResults = {
    results: [],
    totalCount: 0,
    hasMore: false,
    query: undefined,
  } // Temporary placeholder

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    // Clear search when changing conversations
    if (showSearchResults) {
      setShowSearchResults(false)
      setSearchFilters(null)
    }
  }

  const handleQuickSearch = (query: string) => {
    if (query.trim()) {
      setSearchFilters({
        searchTerm: query,
        conversationId: selectedConversationId,
      })
      setShowSearchResults(true)
    } else {
      setShowSearchResults(false)
      setSearchFilters(null)
    }
  }

  const handleAdvancedSearch = (filters: any) => {
    setSearchFilters(filters)
    setShowSearchResults(true)
  }

  // Export functionality is now handled by ExportDropdown component

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message History</h1>
          <p className="text-muted-foreground">
            Browse and search through conversation history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <ExportDropdown
            data={showSearchResults ? searchResults.results || [] : []}
            filters={searchFilters}
            disabled={!showSearchResults || !searchResults.results?.length}
          />
        </div>
      </div>

      {/* Enhanced Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickSearchBar
            onSearch={handleQuickSearch}
            onAdvancedSearch={handleAdvancedSearch}
            placeholder={
              selectedConversationId
                ? 'Search in this conversation...'
                : 'Search all messages...'
            }
            conversationId={selectedConversationId}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Conversation Selector */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ConversationSelector
                selectedConversation={selectedConversationId}
                onConversationSelect={handleConversationSelect}
              />
            </CardContent>
          </Card>
        </div>

        {/* Content Area - Search Results or Message History */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                {showSearchResults
                  ? `Search Results ${searchResults ? `(${searchResults.totalCount})` : ''}`
                  : selectedConversationId
                    ? 'Message Timeline'
                    : 'Select a Conversation'}
              </CardTitle>
              {showSearchResults && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {searchResults
                      ? `Found ${searchResults.totalCount} results`
                      : 'Searching...'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSearchResults(false)
                      setSearchFilters(null)
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Search
                  </Button>
                </div>
              )}
              {selectedConversationId && !showSearchResults && (
                <p className="text-sm text-muted-foreground">
                  Scroll up to load older messages • Use search to find specific
                  content
                </p>
              )}
            </CardHeader>
            <CardContent className="h-full p-0">
              {showSearchResults ? (
                <div className="h-[600px] overflow-y-auto p-4">
                  <SearchResults
                    results={searchResults?.results || []}
                    searchTerms={
                      searchFilters?.useBooleanSearch
                        ? searchResults?.query
                        : undefined
                    }
                    isLoading={searchResults === undefined}
                    hasMore={searchResults?.hasMore}
                  />
                </div>
              ) : selectedConversationId ? (
                <MessageHistory
                  conversationId={selectedConversationId}
                  userId={userId}
                  userName={userName}
                  className="h-[600px]"
                />
              ) : (
                <div className="flex h-[600px] items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <h3 className="mb-2 text-lg font-medium">
                      No Conversation Selected
                    </h3>
                    <p className="text-sm">
                      Choose a conversation from the left to view its message
                      history or use the search bar above to find specific
                      content
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
