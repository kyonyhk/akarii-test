'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'

interface SearchFilters {
  searchTerm: string
  conversationId?: string
  statementTypes: string[]
  confidenceRange: [number, number]
  dateRange: {
    start?: Date
    end?: Date
  }
  minVotes: number
  hasAnalysis: boolean
  searchInBeliefs: boolean
  searchInTradeOffs: boolean
  useBooleanSearch: boolean
}

interface AdvancedSearchModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSearch: (filters: SearchFilters) => void
  initialFilters?: Partial<SearchFilters>
}

const STATEMENT_TYPES = [
  { value: 'question', label: 'Questions' },
  { value: 'opinion', label: 'Opinions' },
  { value: 'fact', label: 'Facts' },
  { value: 'request', label: 'Requests' },
  { value: 'other', label: 'Other' },
]

export function AdvancedSearchModal({
  isOpen,
  onOpenChange,
  onSearch,
  initialFilters = {},
}: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    statementTypes: [],
    confidenceRange: [0, 100],
    dateRange: {},
    minVotes: 0,
    hasAnalysis: false,
    searchInBeliefs: false,
    searchInTradeOffs: false,
    useBooleanSearch: false,
    ...initialFilters,
  })

  const [filtersExpanded, setFiltersExpanded] = useState({
    content: true,
    analysis: false,
    temporal: false,
    social: false,
  })

  useEffect(() => {
    if (initialFilters) {
      setFilters(prev => ({ ...prev, ...initialFilters }))
    }
  }, [initialFilters])

  const handleSearch = () => {
    onSearch(filters)
    onOpenChange(false)
  }

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      statementTypes: [],
      confidenceRange: [0, 100],
      dateRange: {},
      minVotes: 0,
      hasAnalysis: false,
      searchInBeliefs: false,
      searchInTradeOffs: false,
      useBooleanSearch: false,
    })
  }

  const handleStatementTypeChange = (type: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      statementTypes: checked
        ? [...prev.statementTypes, type]
        : prev.statementTypes.filter(t => t !== type)
    }))
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.searchTerm) count++
    if (filters.statementTypes.length > 0) count++
    if (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100) count++
    if (filters.dateRange.start || filters.dateRange.end) count++
    if (filters.minVotes > 0) count++
    if (filters.hasAnalysis) count++
    if (filters.searchInBeliefs) count++
    if (filters.searchInTradeOffs) count++
    return count
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search & Filter
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Query */}
          <Collapsible
            open={filtersExpanded.content}
            onOpenChange={(open) => setFiltersExpanded(prev => ({ ...prev, content: open }))}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <h3 className="text-lg font-semibold">Search Content</h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded.content ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="searchTerm">Search Query</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="searchTerm"
                    placeholder="Enter search terms..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="useBooleanSearch"
                    checked={filters.useBooleanSearch}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, useBooleanSearch: checked }))}
                  />
                  <Label htmlFor="useBooleanSearch" className="text-sm">
                    Use boolean operators (AND, OR, NOT)
                  </Label>
                </div>
                {filters.useBooleanSearch && (
                  <p className="text-xs text-muted-foreground">
                    Examples: "AI AND machine learning", "question OR opinion", "NOT politics"
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="searchInBeliefs"
                    checked={filters.searchInBeliefs}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, searchInBeliefs: checked }))}
                  />
                  <Label htmlFor="searchInBeliefs" className="text-sm">Search in beliefs</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="searchInTradeOffs"
                    checked={filters.searchInTradeOffs}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, searchInTradeOffs: checked }))}
                  />
                  <Label htmlFor="searchInTradeOffs" className="text-sm">Search in trade-offs</Label>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Analysis Filters */}
          <Collapsible
            open={filtersExpanded.analysis}
            onOpenChange={(open) => setFiltersExpanded(prev => ({ ...prev, analysis: open }))}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <h3 className="text-lg font-semibold">Analysis Filters</h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded.analysis ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasAnalysis"
                  checked={filters.hasAnalysis}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasAnalysis: checked }))}
                />
                <Label htmlFor="hasAnalysis">Only show messages with analysis</Label>
              </div>

              <div className="space-y-2">
                <Label>Statement Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {STATEMENT_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={filters.statementTypes.includes(type.value)}
                        onCheckedChange={(checked) => handleStatementTypeChange(type.value, checked as boolean)}
                      />
                      <Label htmlFor={type.value} className="text-sm">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confidence Level Range: {filters.confidenceRange[0]}% - {filters.confidenceRange[1]}%</Label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={filters.confidenceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, confidenceRange: value as [number, number] }))}
                  className="w-full"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Social Filters */}
          <Collapsible
            open={filtersExpanded.social}
            onOpenChange={(open) => setFiltersExpanded(prev => ({ ...prev, social: open }))}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <h3 className="text-lg font-semibold">Social Filters</h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded.social ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="minVotes">Minimum Total Votes: {filters.minVotes}</Label>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={[filters.minVotes]}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, minVotes: value[0] }))}
                  className="w-full"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Temporal Filters */}
          <Collapsible
            open={filtersExpanded.temporal}
            onOpenChange={(open) => setFiltersExpanded(prev => ({ ...prev, temporal: open }))}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <h3 className="text-lg font-semibold">Date Range</h3>
                <ChevronDown className={`h-4 w-4 transition-transform ${filtersExpanded.temporal ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        start: e.target.value ? new Date(e.target.value) : undefined
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        end: e.target.value ? new Date(e.target.value) : undefined
                      }
                    }))}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={resetFilters}>
            Reset All
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}