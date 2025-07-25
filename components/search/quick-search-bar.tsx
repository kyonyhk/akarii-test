'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { AdvancedSearchModal } from './advanced-search-modal'
// import { useQuery } from 'convex/react'
// import { api } from '@/convex/_generated/api'
import { debounce } from 'lodash'

interface QuickSearchBarProps {
  onSearch: (query: string, isAdvanced?: boolean) => void
  onAdvancedSearch?: (filters: any) => void
  placeholder?: string
  className?: string
  conversationId?: string
  showAdvancedButton?: boolean
}

export function QuickSearchBar({
  onSearch,
  onAdvancedSearch,
  placeholder = 'Search messages...',
  className = '',
  conversationId,
  showAdvancedButton = true,
}: QuickSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [suggestionQuery, setSuggestionQuery] = useState('')

  // Get search suggestions
  // const suggestions = useQuery(
  //   api.search.getSearchSuggestions,
  //   suggestionQuery.length >= 2
  //     ? {
  //         query: suggestionQuery,
  //         type: 'all' as const,
  //         limit: 8
  //       }
  //     : 'skip'
  // )
  const suggestions: string[] = [] // Temporary placeholder

  // Debounced function to update suggestion query
  const debouncedSetSuggestionQuery = useCallback(
    debounce((query: string) => {
      setSuggestionQuery(query)
    }, 300),
    [setSuggestionQuery]
  )

  useEffect(() => {
    if (searchQuery.length >= 2) {
      debouncedSetSuggestionQuery(searchQuery)
    } else {
      setSuggestionQuery('')
    }
  }, [searchQuery, debouncedSetSuggestionQuery])

  const handleSearch = (query: string = searchQuery) => {
    if (query.trim()) {
      onSearch(query.trim())
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion)
    handleSearch(suggestion)
  }

  const clearSearch = () => {
    setSearchQuery('')
    onSearch('')
  }

  const handleAdvancedSearch = (filters: any) => {
    if (onAdvancedSearch) {
      onAdvancedSearch(filters)
    }
    setShowAdvancedModal(false)
  }

  const hasActiveSearch = searchQuery.trim().length > 0

  return (
    <>
      <div className={`relative flex items-center gap-2 ${className}`}>
        <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setShowSuggestions(e.target.value.length >= 2)
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchQuery.length >= 2) {
                    setShowSuggestions(true)
                  }
                }}
                className="pl-10 pr-10"
              />
              {hasActiveSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={e => e.preventDefault()}
          >
            <Command>
              <CommandList>
                <CommandEmpty>No suggestions found.</CommandEmpty>
                {suggestions && suggestions.length > 0 && (
                  <CommandGroup heading="Suggestions">
                    {suggestions.map((suggestion, index) => (
                      <CommandItem
                        key={index}
                        value={suggestion}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                        className="cursor-pointer"
                      >
                        <Search className="mr-2 h-3 w-3" />
                        {suggestion}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup>
                  <CommandItem
                    onSelect={() => handleSearch()}
                    className="cursor-pointer font-medium"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search for &ldquo;{searchQuery}&rdquo;
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {showAdvancedButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedModal(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Advanced
          </Button>
        )}
      </div>

      {/* Show active search indicator */}
      {hasActiveSearch && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Searching: &ldquo;{searchQuery}&rdquo;
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedModal}
        onOpenChange={setShowAdvancedModal}
        onSearch={handleAdvancedSearch}
        initialFilters={{
          searchTerm: searchQuery,
          conversationId,
        }}
      />
    </>
  )
}
