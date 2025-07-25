'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Filter, Settings, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfidenceThresholds } from '@/hooks/useConfidenceThresholds'

interface ConfidenceFilterProps {
  onFilterChange: (filters: ConfidenceFilters) => void
  className?: string
}

export interface ConfidenceFilters {
  showLowConfidence: boolean
  showGreyedOut: boolean
  showWarnings: boolean
  minConfidence: number
  hideBelow: boolean
}

export function ConfidenceFilter({
  onFilterChange,
  className,
}: ConfidenceFilterProps) {
  const thresholds = useConfidenceThresholds()
  const [filters, setFilters] = useState<ConfidenceFilters>({
    showLowConfidence: true,
    showGreyedOut: true,
    showWarnings: true,
    minConfidence: 0,
    hideBelow: false,
  })
  const [isOpen, setIsOpen] = useState(false)

  const updateFilters = (newFilters: Partial<ConfidenceFilters>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    onFilterChange(updated)
  }

  const hasActiveFilters =
    !filters.showLowConfidence ||
    !filters.showGreyedOut ||
    !filters.showWarnings ||
    filters.minConfidence > 0 ||
    filters.hideBelow

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2',
            hasActiveFilters && 'bg-primary/5 ring-2 ring-primary/20',
            className
          )}
        >
          <Filter className="h-4 w-4" />
          Confidence
          {hasActiveFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              Confidence Level Filtering
            </h4>
            <p className="text-xs text-muted-foreground">
              Control which analyses are shown based on confidence levels
            </p>
          </div>

          <div className="space-y-4">
            {/* Show/Hide toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="show-low"
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Low confidence (&lt;{thresholds.displayThreshold}%)
                </Label>
                <Switch
                  id="show-low"
                  checked={filters.showLowConfidence}
                  onCheckedChange={checked =>
                    updateFilters({ showLowConfidence: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="show-grey"
                  className="flex items-center gap-2 text-sm"
                >
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                  Greyed out analyses
                </Label>
                <Switch
                  id="show-grey"
                  checked={filters.showGreyedOut}
                  onCheckedChange={checked =>
                    updateFilters({ showGreyedOut: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="show-warnings"
                  className="flex items-center gap-2 text-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  Warning level (&lt;{thresholds.warningThreshold}%)
                </Label>
                <Switch
                  id="show-warnings"
                  checked={filters.showWarnings}
                  onCheckedChange={checked =>
                    updateFilters({ showWarnings: checked })
                  }
                />
              </div>
            </div>

            {/* Minimum confidence slider */}
            <div className="space-y-2">
              <Label className="text-sm">
                Minimum confidence: {filters.minConfidence}%
              </Label>
              <Slider
                value={[filters.minConfidence]}
                onValueChange={([value]) =>
                  updateFilters({ minConfidence: value })
                }
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Hard hide below threshold */}
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-below" className="text-sm">
                Hide all below minimum
              </Label>
              <Switch
                id="hide-below"
                checked={filters.hideBelow}
                onCheckedChange={checked =>
                  updateFilters({ hideBelow: checked })
                }
              />
            </div>
          </div>

          {/* Reset button */}
          <div className="border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateFilters({
                  showLowConfidence: true,
                  showGreyedOut: true,
                  showWarnings: true,
                  minConfidence: 0,
                  hideBelow: false,
                })
              }
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Helper function to check if analysis should be shown based on filters
export function shouldShowAnalysisWithFilters(
  confidenceLevel: number,
  filters: ConfidenceFilters,
  thresholds: {
    displayThreshold: number
    hideThreshold: number
    warningThreshold: number
  }
): boolean {
  // Apply minimum confidence filter first
  if (filters.hideBelow && confidenceLevel < filters.minConfidence) {
    return false
  }

  // Check specific confidence level filters
  if (confidenceLevel < thresholds.hideThreshold) {
    return false // Always hide below hide threshold
  }

  if (
    confidenceLevel < thresholds.displayThreshold &&
    !filters.showLowConfidence
  ) {
    return false
  }

  if (confidenceLevel < thresholds.displayThreshold && !filters.showGreyedOut) {
    return false
  }

  if (confidenceLevel < thresholds.warningThreshold && !filters.showWarnings) {
    return false
  }

  return true
}
